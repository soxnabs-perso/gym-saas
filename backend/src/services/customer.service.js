import Customer from '../models/Customer.js';
import { ApiError } from '../utils/errors.js';

/**
 * Every query is keyed on `owner`, so one gym can never read or mutate
 * another's records — the isolation is enforced in the query itself rather
 * than filtered out afterwards.
 */
export async function listCustomers(ownerId, { page, limit, status, search, archived }) {
  const filter = { owner: ownerId };

  filter.archivedAt = archived ? { $ne: null } : null;

  if (status) filter.membershipStatus = status;
  if (search) {
    filter.fullName = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Customer.countDocuments(filter),
  ]);

  return { customers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

/** Archived customers are still readable, so their history stays reachable. */
export async function getCustomer(ownerId, id) {
  const customer = await Customer.findOne({ _id: id, owner: ownerId }).lean();
  if (!customer) {
    throw ApiError.notFound('Customer not found');
  }
  return customer;
}

export async function createCustomer(ownerId, data) {
  return Customer.create({ ...data, owner: ownerId });
}

export async function updateCustomer(ownerId, id, data) {
  const customer = await Customer.findOneAndUpdate(
    { _id: id, owner: ownerId },
    data,
    { new: true, runValidators: true }
  ).lean();

  if (!customer) {
    throw ApiError.notFound('Customer not found');
  }
  return customer;
}

/**
 * Archiving replaces deletion: the record and its invoices survive, the
 * customer simply drops out of the active list. Restoring undoes it.
 */
export async function archiveCustomer(ownerId, id) {
  const customer = await Customer.findOneAndUpdate(
    { _id: id, owner: ownerId, archivedAt: null },
    { archivedAt: new Date(), membershipStatus: 'cancelled' },
    { new: true, runValidators: true }
  ).lean();

  if (!customer) {
    throw ApiError.notFound('Customer not found, or already archived');
  }
  return customer;
}

export async function restoreCustomer(ownerId, id) {
  const customer = await Customer.findOneAndUpdate(
    { _id: id, owner: ownerId, archivedAt: { $ne: null } },
    { archivedAt: null, membershipStatus: 'active' },
    { new: true, runValidators: true }
  ).lean();

  if (!customer) {
    throw ApiError.notFound('Customer not found, or not archived');
  }
  return customer;
}
