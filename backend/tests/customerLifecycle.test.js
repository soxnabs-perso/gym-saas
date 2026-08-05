import './setup.js';
import request from 'supertest';
import createApp from '../src/app.js';
import { resolveRange } from '../src/services/invoice.service.js';

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

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function createCustomer(token, overrides = {}) {
  const res = await request(app)
    .post('/api/v1/customers')
    .set(auth(token))
    .send({
      fullName: 'Moussa Ndiaye',
      phone: '+221770000001',
      subscriptionFee: 20000,
      ...overrides,
    });
  return res;
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('customer name rules match manager name rules', () => {
  it('rejects a customer name containing digits', async () => {
    const token = await signupAndGetToken('name1@test.com');
    const res = await createCustomer(token, { fullName: 'Custom1' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].message).toMatch(/letters and spaces/i);
  });

  it('rejects a single character customer name', async () => {
    const token = await signupAndGetToken('name2@test.com');
    const res = await createCustomer(token, { fullName: 'A' });

    expect(res.status).toBe(400);
  });

  it('accepts a name with accented letters', async () => {
    const token = await signupAndGetToken('name3@test.com');
    const res = await createCustomer(token, { fullName: 'Aïssatou Diallo' });

    expect(res.status).toBe(201);
  });
});

describe('duplicate customer emails', () => {
  it('allows any number of customers with no email at all', async () => {
    const token = await signupAndGetToken('noemail@test.com');

    const first = await createCustomer(token, { fullName: 'Member One', phone: '+221770000101' });
    const second = await createCustomer(token, { fullName: 'Member Two', phone: '+221770000102' });
    const third = await createCustomer(token, { fullName: 'Member Three', phone: '+221770000103' });

    expect([first.status, second.status, third.status]).toEqual([201, 201, 201]);
  });

  it('rejects a repeated email and names the field the manager typed', async () => {
    const token = await signupAndGetToken('dupe@test.com');

    await createCustomer(token, {
      fullName: 'First Member',
      phone: '+221770000201',
      email: 'shared@member.test',
    });
    const clash = await createCustomer(token, {
      fullName: 'Second Member',
      phone: '+221770000202',
      email: 'shared@member.test',
    });

    expect(clash.status).toBe(409);
    expect(clash.body.message).toContain('email');
    expect(clash.body.message).not.toContain('owner');
  });

  it('lets two different managers use the same customer email', async () => {
    const tokenA = await signupAndGetToken('ownerX@test.com');
    const tokenB = await signupAndGetToken('ownerY@test.com');

    const a = await createCustomer(tokenA, { phone: '+221770000301', email: 'same@member.test' });
    const b = await createCustomer(tokenB, { phone: '+221770000302', email: 'same@member.test' });

    expect([a.status, b.status]).toEqual([201, 201]);
  });
});

describe('editing a customer', () => {
  it('updates the contact details, plan and fee', async () => {
    const token = await signupAndGetToken('edit1@test.com');
    const created = await createCustomer(token);

    const res = await request(app)
      .patch(`/api/v1/customers/${created.body.customer._id}`)
      .set(auth(token))
      .send({
        fullName: 'Moussa Ndiaye Sarr',
        phone: '+221770009999',
        membershipPlan: 'annual',
        subscriptionFee: 200000,
        membershipStatus: 'paused',
      });

    expect(res.status).toBe(200);
    expect(res.body.customer).toMatchObject({
      fullName: 'Moussa Ndiaye Sarr',
      phone: '+221770009999',
      membershipPlan: 'annual',
      subscriptionFee: 200000,
      membershipStatus: 'paused',
    });
  });

  it('applies the shared name rule on edit too', async () => {
    const token = await signupAndGetToken('edit2@test.com');
    const created = await createCustomer(token);

    const res = await request(app)
      .patch(`/api/v1/customers/${created.body.customer._id}`)
      .set(auth(token))
      .send({ fullName: 'Customer 2' });

    expect(res.status).toBe(400);
  });

  it('will not edit another manager\'s customer', async () => {
    const tokenA = await signupAndGetToken('editA@test.com');
    const tokenB = await signupAndGetToken('editB@test.com');
    const created = await createCustomer(tokenA);

    const res = await request(app)
      .patch(`/api/v1/customers/${created.body.customer._id}`)
      .set(auth(tokenB))
      .send({ fullName: 'Stolen Name' });

    expect(res.status).toBe(404);
  });
});

describe('archiving instead of deleting', () => {
  it('offers no delete endpoint and says so with the methods it does accept', async () => {
    const token = await signupAndGetToken('nodelete@test.com');
    const created = await createCustomer(token);

    const res = await request(app)
      .delete(`/api/v1/customers/${created.body.customer._id}`)
      .set(auth(token));

    expect(res.status).toBe(405);
    expect(res.headers.allow).toContain('PATCH');
    expect(res.headers.allow).not.toContain('DELETE');
  });

  it('archives a customer, hiding them from the default list', async () => {
    const token = await signupAndGetToken('arch1@test.com');
    const created = await createCustomer(token);
    const id = created.body.customer._id;

    const archived = await request(app)
      .post(`/api/v1/customers/${id}/archive`)
      .set(auth(token));
    expect(archived.status).toBe(200);
    expect(archived.body.customer.archivedAt).toBeTruthy();
    expect(archived.body.customer.membershipStatus).toBe('cancelled');

    const active = await request(app).get('/api/v1/customers').set(auth(token));
    expect(active.body.customers).toHaveLength(0);

    const onlyArchived = await request(app)
      .get('/api/v1/customers?archived=true')
      .set(auth(token));
    expect(onlyArchived.body.customers).toHaveLength(1);
  });

  it('keeps the archived customer readable and restorable', async () => {
    const token = await signupAndGetToken('arch2@test.com');
    const created = await createCustomer(token);
    const id = created.body.customer._id;

    await request(app).post(`/api/v1/customers/${id}/archive`).set(auth(token));

    const fetched = await request(app).get(`/api/v1/customers/${id}`).set(auth(token));
    expect(fetched.status).toBe(200);

    const restored = await request(app)
      .post(`/api/v1/customers/${id}/restore`)
      .set(auth(token));
    expect(restored.status).toBe(200);
    expect(restored.body.customer.archivedAt).toBeNull();
    expect(restored.body.customer.membershipStatus).toBe('active');

    const active = await request(app).get('/api/v1/customers').set(auth(token));
    expect(active.body.customers).toHaveLength(1);
  });

  it('refuses to archive twice, and will not invoice an archived customer', async () => {
    const token = await signupAndGetToken('arch3@test.com');
    const created = await createCustomer(token);
    const id = created.body.customer._id;

    await request(app).post(`/api/v1/customers/${id}/archive`).set(auth(token));

    const again = await request(app).post(`/api/v1/customers/${id}/archive`).set(auth(token));
    expect(again.status).toBe(409);

    const invoice = await request(app)
      .post('/api/v1/invoices')
      .set(auth(token))
      .send({ customerId: id, amount: 1000, dueDate: daysFromNow(7) });
    expect(invoice.status).toBe(400);
  });
});

describe('invoices become overdue once the due date passes', () => {
  it('creates an invoice with a past due date as overdue', async () => {
    const token = await signupAndGetToken('over1@test.com');
    const customer = await createCustomer(token);

    const res = await request(app)
      .post('/api/v1/invoices')
      .set(auth(token))
      .send({ customerId: customer.body.customer._id, amount: 5000, dueDate: daysFromNow(-1) });

    expect(res.status).toBe(201);
    expect(res.body.invoice.status).toBe('overdue');
  });

  it('leaves a future due date pending', async () => {
    const token = await signupAndGetToken('over2@test.com');
    const customer = await createCustomer(token);

    const res = await request(app)
      .post('/api/v1/invoices')
      .set(auth(token))
      .send({ customerId: customer.body.customer._id, amount: 5000, dueDate: daysFromNow(7) });

    expect(res.body.invoice.status).toBe('pending');
  });

  it('promotes a pending invoice to overdue when its due date passes', async () => {
    const token = await signupAndGetToken('over3@test.com');
    const customer = await createCustomer(token);

    const created = await request(app)
      .post('/api/v1/invoices')
      .set(auth(token))
      .send({ customerId: customer.body.customer._id, amount: 5000, dueDate: daysFromNow(7) });
    expect(created.body.invoice.status).toBe('pending');

    const { default: Invoice } = await import('../src/models/Invoice.js');
    await Invoice.updateOne(
      { _id: created.body.invoice._id },
      { dueDate: new Date(Date.now() - 86400000) }
    );

    const list = await request(app).get('/api/v1/invoices').set(auth(token));
    expect(list.body.invoices[0].status).toBe('overdue');
  });

  it('does not touch a paid invoice whose due date has passed', async () => {
    const token = await signupAndGetToken('over4@test.com');
    const customer = await createCustomer(token);

    const created = await request(app)
      .post('/api/v1/invoices')
      .set(auth(token))
      .send({ customerId: customer.body.customer._id, amount: 5000, dueDate: daysFromNow(1) });

    await request(app)
      .patch(`/api/v1/invoices/${created.body.invoice._id}/status`)
      .set(auth(token))
      .send({ status: 'paid' });

    const { default: Invoice } = await import('../src/models/Invoice.js');
    await Invoice.updateOne(
      { _id: created.body.invoice._id },
      { dueDate: new Date(Date.now() - 86400000) }
    );

    const list = await request(app).get('/api/v1/invoices').set(auth(token));
    expect(list.body.invoices[0].status).toBe('paid');
  });
});

describe('cancelling an invoice requires a reason', () => {
  async function anInvoice(token) {
    const customer = await createCustomer(token);
    const res = await request(app)
      .post('/api/v1/invoices')
      .set(auth(token))
      .send({ customerId: customer.body.customer._id, amount: 9000, dueDate: daysFromNow(7) });
    return res.body.invoice._id;
  }

  it('rejects a cancellation with no reason', async () => {
    const token = await signupAndGetToken('cancel1@test.com');
    const id = await anInvoice(token);

    const res = await request(app)
      .patch(`/api/v1/invoices/${id}/status`)
      .set(auth(token))
      .send({ status: 'cancelled' });

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toContain('cancellationReason');
  });

  it('rejects a blank reason', async () => {
    const token = await signupAndGetToken('cancel2@test.com');
    const id = await anInvoice(token);

    const res = await request(app)
      .patch(`/api/v1/invoices/${id}/status`)
      .set(auth(token))
      .send({ status: 'cancelled', cancellationReason: '   ' });

    expect(res.status).toBe(400);
  });

  it('stores the reason when cancelling', async () => {
    const token = await signupAndGetToken('cancel3@test.com');
    const id = await anInvoice(token);

    const res = await request(app)
      .patch(`/api/v1/invoices/${id}/status`)
      .set(auth(token))
      .send({ status: 'cancelled', cancellationReason: 'Member left the gym' });

    expect(res.status).toBe(200);
    expect(res.body.invoice.status).toBe('cancelled');
    expect(res.body.invoice.cancellationReason).toBe('Member left the gym');
    expect(res.body.invoice.cancelledAt).toBeTruthy();
  });

  it('does not require or keep a reason for other statuses', async () => {
    const token = await signupAndGetToken('cancel4@test.com');
    const id = await anInvoice(token);

    await request(app)
      .patch(`/api/v1/invoices/${id}/status`)
      .set(auth(token))
      .send({ status: 'cancelled', cancellationReason: 'Mistake' });

    const res = await request(app)
      .patch(`/api/v1/invoices/${id}/status`)
      .set(auth(token))
      .send({ status: 'paid' });

    expect(res.status).toBe(200);
    expect(res.body.invoice.cancellationReason).toBeNull();
    expect(res.body.invoice.cancelledAt).toBeNull();
  });
});

describe('dashboard ranges', () => {
  it('resolves calendar month, quarter and year boundaries', () => {
    const now = new Date('2026-08-15T12:00:00Z');

    const month = resolveRange('month', now);
    expect(month.from.getMonth()).toBe(7);
    expect(month.from.getDate()).toBe(1);
    expect(month.to.getMonth()).toBe(8);

    const quarter = resolveRange('quarter', now);
    expect(quarter.from.getMonth()).toBe(6);
    expect(quarter.to.getMonth()).toBe(9);

    const year = resolveRange('year', now);
    expect(year.from.getMonth()).toBe(0);
    expect(year.from.getDate()).toBe(1);
    expect(year.to.getFullYear()).toBe(now.getFullYear() + 1);
  });

  it('reports revenue and outstanding for each range', async () => {
    const token = await signupAndGetToken('range1@test.com');
    const customer = await createCustomer(token);
    const customerId = customer.body.customer._id;

    const paid = await request(app)
      .post('/api/v1/invoices')
      .set(auth(token))
      .send({ customerId, amount: 30000, dueDate: daysFromNow(3) });
    await request(app)
      .patch(`/api/v1/invoices/${paid.body.invoice._id}/status`)
      .set(auth(token))
      .send({ status: 'paid' });

    await request(app)
      .post('/api/v1/invoices')
      .set(auth(token))
      .send({ customerId, amount: 12000, dueDate: new Date().toISOString().slice(0, 10) });

    for (const range of ['month', 'quarter', 'year']) {
      const res = await request(app)
        .get(`/api/v1/invoices/dashboard/summary?range=${range}`)
        .set(auth(token));

      expect(res.status).toBe(200);
      expect(res.body.range).toBe(range);
      expect(res.body.revenue).toBe(30000);
      expect(res.body.outstandingAmount).toBe(12000);
      expect(res.body.outstandingCount).toBe(1);
    }
  });

  it('defaults to the month and rejects an unknown range', async () => {
    const token = await signupAndGetToken('range2@test.com');

    const defaulted = await request(app)
      .get('/api/v1/invoices/dashboard/summary')
      .set(auth(token));
    expect(defaulted.body.range).toBe('month');

    const bad = await request(app)
      .get('/api/v1/invoices/dashboard/summary?range=weekly')
      .set(auth(token));
    expect(bad.status).toBe(400);
  });

  it('counts only active customers', async () => {
    const token = await signupAndGetToken('range3@test.com');
    const first = await createCustomer(token);
    await createCustomer(token, { fullName: 'Second Member', phone: '+221770000002' });

    await request(app)
      .post(`/api/v1/customers/${first.body.customer._id}/archive`)
      .set(auth(token));

    const res = await request(app)
      .get('/api/v1/invoices/dashboard/summary')
      .set(auth(token));

    expect(res.body.totalCustomers).toBe(1);
  });
});
