import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import { ApiError } from '../utils/errors.js';

export async function listInvoices(ownerId, { page, limit, customerId, status }) {
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
  // Confirms the customer belongs to this manager before an invoice can be
  // attached to it, so a guessed id cannot bill another gym's member.
  const customer = await Customer.findOne({ _id: customerId, owner: ownerId }).lean();
  if (!customer) {
    throw ApiError.notFound('Customer not found');
  }

  return Invoice.create({
    owner: ownerId,
    customer: customer._id,
    invoiceNumber: Invoice.generateInvoiceNumber(),
    amount,
    currency,
    description,
    dueDate,
  });
}

export async function updateInvoiceStatus(ownerId, id, status) {
  const update = { status };
  update.paidAt = status === 'paid' ? new Date() : null;

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

export async function getDashboardSummary(ownerId) {
  const owner = new mongoose.Types.ObjectId(ownerId);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Aggregated in the database rather than by loading invoices into memory,
  // so the dashboard cost stays flat as a gym's invoice history grows.
  const [totalCustomers, revenueAgg, outstandingAgg] = await Promise.all([
    Customer.countDocuments({ owner }),
    Invoice.aggregate([
      { $match: { owner, status: 'paid', paidAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Invoice.aggregate([
      { $match: { owner, status: { $in: ['pending', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  return {
    totalCustomers,
    revenueThisMonth: revenueAgg[0]?.total || 0,
    outstandingAmount: outstandingAgg[0]?.total || 0,
    outstandingCount: outstandingAgg[0]?.count || 0,
  };
}
