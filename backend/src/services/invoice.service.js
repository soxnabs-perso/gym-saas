import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import { ApiError } from '../utils/errors.js';

/**
 * Promotes pending invoices whose due date has passed to `overdue`.
 *
 * Run before any read that reports status, so the stored value converges on
 * the truth without needing a scheduled job. Only `pending` invoices are
 * touched: paid and cancelled ones are settled, whatever their due date.
 */
export async function syncOverdueInvoices(ownerId) {
  const result = await Invoice.updateMany(
    { owner: ownerId, status: 'pending', dueDate: { $lte: new Date() } },
    { status: 'overdue' }
  );
  return result.modifiedCount ?? 0;
}

export async function listInvoices(ownerId, { page, limit, customerId, status }) {
  await syncOverdueInvoices(ownerId);

  const filter = { owner: ownerId };
  if (customerId) filter.customer = customerId;
  if (status) filter.status = status;

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .populate('customer', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Invoice.countDocuments(filter),
  ]);

  return { invoices, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function createInvoice(ownerId, { customerId, amount, currency, description, dueDate }) {
  const customer = await Customer.findOne({ _id: customerId, owner: ownerId }).lean();
  if (!customer) {
    throw ApiError.notFound('Customer not found');
  }

  if (customer.archivedAt) {
    throw ApiError.badRequest('This customer is archived; restore them before invoicing');
  }

  return Invoice.create({
    owner: ownerId,
    customer: customer._id,
    invoiceNumber: Invoice.generateInvoiceNumber(),
    amount,
    currency,
    description,
    status: new Date(dueDate) <= new Date() ? 'overdue' : 'pending',
    dueDate,
  });
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
  return invoice;
}

export async function deleteInvoice(ownerId, id) {
  const invoice = await Invoice.findOneAndDelete({ _id: id, owner: ownerId }).lean();
  if (!invoice) {
    throw ApiError.notFound('Invoice not found');
  }
}

/**
 * Start of the calendar period containing `now`, and the start of the next
 * one. Quarters are calendar quarters: Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec.
 */
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
  await syncOverdueInvoices(ownerId);

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
