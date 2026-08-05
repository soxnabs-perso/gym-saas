import Customer from '../models/Customer.js';
import { ApiError } from '../utils/errors.js';

/**
 * Every query is keyed on `owner` so one gym can never read or mutate another's records the isolation is enforced in 
 * the query itself rather than filtered out afterwards.
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

/** Archived customers are still readable so their history stays reachable. */
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
async function transition(ownerId, id, { guard, update, conflict }) {
  const customer = await Customer.findOneAndUpdate(
    { _id: id, owner: ownerId, ...guard },
    update,
    { new: true, runValidators: true }
  ).lean();

  if (customer) return customer;

  const exists = await Customer.exists({ _id: id, owner: ownerId });
  if (exists) {
    throw ApiError.conflict(conflict);
  }
  throw ApiError.notFound('Customer not found');
}

export async function archiveCustomer(ownerId, id) {
  return transition(ownerId, id, {
    guard: { archivedAt: null },
    update: { archivedAt: new Date(), membershipStatus: 'cancelled' },
    conflict: 'This customer is already archived',
  });
}

export async function restoreCustomer(ownerId, id) {
  return transition(ownerId, id, {
    guard: { archivedAt: { $ne: null } },
    update: { archivedAt: null, membershipStatus: 'active' },
    conflict: 'This customer is not archived',
  });
}
