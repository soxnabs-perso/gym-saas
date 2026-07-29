import Customer from '../models/Customer.js';
import { ApiError } from '../utils/errors.js';

/**
 * Every query is keyed on `owner`, so one gym can never read or mutate
 * another's records — the isolation is enforced in the query itself rather
 * than filtered out afterwards.
 */
export async function listCustomers(ownerId, { page, limit, status, search }) {
  const filter = { owner: ownerId };
  if (status) filter.membershipStatus = status;
  if (search) {
    // Escaped so a value like ".*" cannot turn into a catastrophic regex.
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

export async function deleteCustomer(ownerId, id) {
  const customer = await Customer.findOneAndDelete({ _id: id, owner: ownerId }).lean();
  if (!customer) {
    throw ApiError.notFound('Customer not found');
  }
}
