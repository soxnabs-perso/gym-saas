import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import { ApiError } from '../utils/errors.js';

/**
 * Promotes pending invoices whose due date has passed to `overdue`. Run before any read that reports status so the 
 * stored value converges on the truth. Only `pending` invoices are touched: paid and cancelled ones are settled
 *  whatever their due date.
 */
export function effectiveStatus(invoice, now = new Date()) {
  if (invoice.status === 'pending' && invoice.dueDate && new Date(invoice.dueDate) <= now) {
    return 'overdue';
  }
  return invoice.status;
}

const withEffectiveStatus = (invoice, now) =>
  invoice && { ...invoice, status: effectiveStatus(invoice, now) };

function statusFilter(status, now) {
  if (status === 'overdue') {
    return { $or: [{ status: 'overdue' }, { status: 'pending', dueDate: { $lte: now } }] };
  }
  if (status === 'pending') {
    return { status: 'pending', dueDate: { $gt: now } };
  }
  return { status };
}

export async function listInvoices(ownerId, { page, limit, customerId, status }) {
  const now = new Date();
  const filter = { owner: ownerId };

  if (customerId) filter.customer = customerId;
  if (status) Object.assign(filter, statusFilter(status, now));

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .populate('customer', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Invoice.countDocuments(filter),
  ]);

  return {
    invoices: invoices.map((invoice) => withEffectiveStatus(invoice, now)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function createInvoice(ownerId, { customerId, amount, currency, description, dueDate }) {
  const customer = await Customer.findOne({ _id: customerId, owner: ownerId }).lean();
  if (!customer) {
    throw ApiError.notFound('Customer not found');
  }

  if (customer.archivedAt) {
    throw ApiError.badRequest('This customer is archived; restore them before invoicing');
  }

  /**
   * Always stored as `pending` even when the due date is already past.
   */
  const created = await Invoice.create({
    owner: ownerId,
    customer: customer._id,
    invoiceNumber: Invoice.generateInvoiceNumber(),
    amount,
    currency,
    description,
    status: 'pending',
    dueDate,
  });

  return withEffectiveStatus(created.toObject());
}

export async function updateInvoiceStatus(ownerId, id, { status, cancellationReason }) {
  const update = { status };

  update.paidAt = status === 'paid' ? new Date() : null;

  if (status === 'cancelled') {
    update.cancelledAt = new Date();
    update.cancellationReason = cancellationReason;
  } else {
    update.cancelledAt = null;
    update.cancellationReason = null;
  }

  const invoice = await Invoice.findOneAndUpdate(
    { _id: id, owner: ownerId },
    update,
    { new: true, runValidators: true }
  ).lean();

  if (!invoice) {
    throw ApiError.notFound('Invoice not found');
  }
  return withEffectiveStatus(invoice);
}

export function resolveRange(range, now = new Date()) {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);

  if (range === 'year') {
    from.setMonth(0, 1);
    to.setTime(from.getTime());
    to.setFullYear(from.getFullYear() + 1);
  } else if (range === 'quarter') {
    from.setMonth(Math.floor(from.getMonth() / 3) * 3, 1);
    to.setTime(from.getTime());
    to.setMonth(from.getMonth() + 3);
  } else {
    from.setDate(1);
    to.setTime(from.getTime());
    to.setMonth(from.getMonth() + 1);
  }

  return { from, to };
}

export async function getDashboardSummary(ownerId, { range }) {
  const owner = new mongoose.Types.ObjectId(ownerId);
  const { from, to } = resolveRange(range);

  const [totalCustomers, revenueAgg, outstandingAgg] = await Promise.all([
    Customer.countDocuments({ owner, archivedAt: null }),
    Invoice.aggregate([
      { $match: { owner, status: 'paid', paidAt: { $gte: from, $lt: to } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    Invoice.aggregate([
      {
        $match: {
          owner,
          status: { $in: ['pending', 'overdue'] },
          dueDate: { $gte: from, $lt: to },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  return {
    range,
    from,
    to,
    totalCustomers,
    revenue: revenueAgg[0]?.total || 0,
    outstandingAmount: outstandingAgg[0]?.total || 0,
    outstandingCount: outstandingAgg[0]?.count || 0,
  };
}
