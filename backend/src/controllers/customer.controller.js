import * as customerService from '../services/customer.service.js';

export async function listCustomers(req, res) {
  const result = await customerService.listCustomers(req.userId, req.validated.query);
  return res.json(result);
}

export async function getCustomer(req, res) {
  const customer = await customerService.getCustomer(req.userId, req.validated.params.id);
  return res.json({ customer });
}

export async function createCustomer(req, res) {
  const customer = await customerService.createCustomer(req.userId, req.validated.body);
  return res.status(201).json({ customer });
}

export async function updateCustomer(req, res) {
  const customer = await customerService.updateCustomer(
    req.userId,
    req.validated.params.id,
    req.validated.body
  );
  return res.json({ customer });
}

export async function deleteCustomer(req, res) {
  await customerService.deleteCustomer(req.userId, req.validated.params.id);
  return res.status(204).send();
}
