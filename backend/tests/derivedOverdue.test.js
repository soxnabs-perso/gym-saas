import './setup.js';
import request from 'supertest';
import createApp from '../src/app.js';
import Invoice from '../src/models/Invoice.js';
import { effectiveStatus } from '../src/services/invoice.service.js';

const app = createApp();

async function signupAndGetToken(email) {
  const res = await request(app).post('/api/v1/auth/signup').send({
    gymName: 'Iron Yard Gym',
    fullName: 'Awa Diop',
    email,
    password: 'StrongPass123!',
  });
  return res.body.accessToken;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function setup(email) {
  const token = await signupAndGetToken(email);
  const customer = await request(app)
    .post('/api/v1/customers')
    .set(auth(token))
    .send({ fullName: 'Moussa Ndiaye', phone: '+221770000001', subscriptionFee: 20000 });

  return { token, customerId: customer.body.customer._id };
}

async function raise(token, customerId, days, amount = 5000) {
  const res = await request(app)
    .post('/api/v1/invoices')
    .set(auth(token))
    .send({ customerId, amount, dueDate: daysFromNow(days) });
  return res.body.invoice;
}

describe('overdue is computed, not stored', () => {
  it('stores pending even when the due date has already passed', async () => {
    const { token, customerId } = await setup('derive1@test.com');

    const invoice = await raise(token, customerId, -1);
    expect(invoice.status).toBe('overdue');

    const stored = await Invoice.findById(invoice._id).lean();
    expect(stored.status).toBe('pending');
  });

  it('does not write to the database when a list is read', async () => {
    const { token, customerId } = await setup('derive2@test.com');
    const invoice = await raise(token, customerId, 7);

    await Invoice.updateOne({ _id: invoice._id }, { dueDate: new Date(Date.now() - 86400000) });
    const before = await Invoice.findById(invoice._id).lean();

    const list = await request(app).get('/api/v1/invoices').set(auth(token));
    expect(list.body.invoices[0].status).toBe('overdue');

    const after = await Invoice.findById(invoice._id).lean();
    expect(after.status).toBe('pending');
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
  });

  it('does not write to the database when the dashboard is read', async () => {
    const { token, customerId } = await setup('derive3@test.com');
    const invoice = await raise(token, customerId, -2);
    const before = await Invoice.findById(invoice._id).lean();

    await request(app).get('/api/v1/invoices/dashboard/summary').set(auth(token));

    const after = await Invoice.findById(invoice._id).lean();
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
  });

  it('reports the same totals however many times the dashboard is called', async () => {
    const { token, customerId } = await setup('derive4@test.com');
    await raise(token, customerId, -3, 12000);

    const first = await request(app).get('/api/v1/invoices/dashboard/summary').set(auth(token));
    const second = await request(app).get('/api/v1/invoices/dashboard/summary').set(auth(token));

    expect(first.body.outstandingAmount).toBe(12000);
    expect(second.body.outstandingAmount).toBe(first.body.outstandingAmount);
    expect(second.body.outstandingCount).toBe(first.body.outstandingCount);
  });
});

describe('filtering on a derived status', () => {
  it('excludes a past-due invoice from the pending filter', async () => {
    const { token, customerId } = await setup('filter1@test.com');
    const future = await raise(token, customerId, 7);
    await raise(token, customerId, -3);

    const res = await request(app).get('/api/v1/invoices?status=pending').set(auth(token));

    expect(res.body.invoices).toHaveLength(1);
    expect(res.body.invoices[0]._id).toBe(future._id);
    expect(res.body.pagination.total).toBe(1);
  });

  it('includes it in the overdue filter instead', async () => {
    const { token, customerId } = await setup('filter2@test.com');
    await raise(token, customerId, 7);
    const past = await raise(token, customerId, -3);

    const res = await request(app).get('/api/v1/invoices?status=overdue').set(auth(token));

    expect(res.body.invoices).toHaveLength(1);
    expect(res.body.invoices[0]._id).toBe(past._id);
    expect(res.body.invoices[0].status).toBe('overdue');
  });

  it('still finds invoices the previous implementation stored as overdue', async () => {
    const { token, customerId } = await setup('filter3@test.com');
    const invoice = await raise(token, customerId, 7);
    await Invoice.updateOne({ _id: invoice._id }, { status: 'overdue' });

    const res = await request(app).get('/api/v1/invoices?status=overdue').set(auth(token));
    expect(res.body.invoices.map((i) => i._id)).toContain(invoice._id);
  });

  it('leaves paid and cancelled invoices alone once their due date passes', async () => {
    const { token, customerId } = await setup('filter4@test.com');
    const paid = await raise(token, customerId, 1);
    const cancelled = await raise(token, customerId, 1);

    await request(app)
      .patch(`/api/v1/invoices/${paid._id}/status`)
      .set(auth(token))
      .send({ status: 'paid' });
    await request(app)
      .patch(`/api/v1/invoices/${cancelled._id}/status`)
      .set(auth(token))
      .send({ status: 'cancelled', cancellationReason: 'Member left' });

    await Invoice.updateMany({}, { dueDate: new Date(Date.now() - 86400000) });

    const list = await request(app).get('/api/v1/invoices').set(auth(token));
    const byId = Object.fromEntries(list.body.invoices.map((i) => [i._id, i.status]));

    expect(byId[paid._id]).toBe('paid');
    expect(byId[cancelled._id]).toBe('cancelled');
  });

  it('keeps a cancelled past-due invoice out of the overdue filter', async () => {
    const { token, customerId } = await setup('filter5@test.com');
    const invoice = await raise(token, customerId, -5);

    await request(app)
      .patch(`/api/v1/invoices/${invoice._id}/status`)
      .set(auth(token))
      .send({ status: 'cancelled', cancellationReason: 'Raised by mistake' });

    const overdue = await request(app).get('/api/v1/invoices?status=overdue').set(auth(token));
    expect(overdue.body.invoices).toHaveLength(0);
  });
});

describe('the derived status cannot be assigned', () => {
  it('rejects a request setting the status to overdue', async () => {
    const { token, customerId } = await setup('assign1@test.com');
    const invoice = await raise(token, customerId, 7);

    const res = await request(app)
      .patch(`/api/v1/invoices/${invoice._id}/status`)
      .set(auth(token))
      .send({ status: 'overdue' });

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toContain('status');
  });

  it('lets a paid invoice go back to pending and read as overdue again', async () => {
    const { token, customerId } = await setup('assign2@test.com');
    const invoice = await raise(token, customerId, -1);

    await request(app)
      .patch(`/api/v1/invoices/${invoice._id}/status`)
      .set(auth(token))
      .send({ status: 'paid' });

    const back = await request(app)
      .patch(`/api/v1/invoices/${invoice._id}/status`)
      .set(auth(token))
      .send({ status: 'pending' });

    expect(back.status).toBe(200);
    expect(back.body.invoice.status).toBe('overdue');
    expect(back.body.invoice.paidAt).toBeNull();
  });
});

describe('effectiveStatus', () => {
  const now = new Date('2026-08-15T12:00:00Z');

  it('promotes only pending invoices whose due date has passed', () => {
    expect(effectiveStatus({ status: 'pending', dueDate: '2026-08-14' }, now)).toBe('overdue');
    expect(effectiveStatus({ status: 'pending', dueDate: '2026-08-16' }, now)).toBe('pending');
    expect(effectiveStatus({ status: 'paid', dueDate: '2026-08-01' }, now)).toBe('paid');
    expect(effectiveStatus({ status: 'cancelled', dueDate: '2026-08-01' }, now)).toBe('cancelled');
    expect(effectiveStatus({ status: 'overdue', dueDate: '2026-08-20' }, now)).toBe('overdue');
  });

  it('treats the due date itself as already due', () => {
    expect(effectiveStatus({ status: 'pending', dueDate: now }, now)).toBe('overdue');
  });
});
