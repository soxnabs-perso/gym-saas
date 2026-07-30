import * as invoiceService from '../services/invoice.service.js';

export async function listInvoices(req, res) {
  const result = await invoiceService.listInvoices(req.userId, req.validated.query);
  return res.json(result);
}

export async function createInvoice(req, res) {
  const invoice = await invoiceService.createInvoice(req.userId, req.validated.body);
  return res.status(201).json({ invoice });
}

export async function updateInvoiceStatus(req, res) {
  const invoice = await invoiceService.updateInvoiceStatus(
    req.userId,
    req.validated.params.id,
    req.validated.body
  );
  return res.json({ invoice });
}

export async function deleteInvoice(req, res) {
  await invoiceService.deleteInvoice(req.userId, req.validated.params.id);
  return res.status(204).send();
}

export async function dashboardSummary(req, res) {
  const summary = await invoiceService.getDashboardSummary(req.userId, req.validated.query);
  return res.json(summary);
}
