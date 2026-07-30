import './setup.js';
import request from 'supertest';
import createApp from '../src/app.js';

const app = createApp();

async function signupAndGetToken(email) {
  const res = await request(app).post('/api/v1/auth/signup').send({
    gymName: 'Test Gym',
    fullName: 'Manager',
    email,
    password: 'StrongPass123!',
  });
  return res.body.accessToken;
}

describe('customers', () => {
  it('creates a customer and lists it back for the owning manager', async () => {
    const token = await signupAndGetToken('owner1@test.com');

    const create = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Moussa Ndiaye',
        phone: '+221770000001',
        membershipPlan: 'monthly',
        subscriptionFee: 15000,
      });

    expect(create.status).toBe(201);

    const list = await request(app).get('/api/v1/customers').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.customers).toHaveLength(1);
    expect(list.body.customers[0].fullName).toBe('Moussa Ndiaye');
  });

  it('does not let one manager see another manager\'s customers', async () => {
    const tokenA = await signupAndGetToken('ownerA@test.com');
    const tokenB = await signupAndGetToken('ownerB@test.com');

    await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ fullName: 'Customer of A', phone: '+221770000002', subscriptionFee: 15000 });

    const listB = await request(app).get('/api/v1/customers').set('Authorization', `Bearer ${tokenB}`);

    expect(listB.status).toBe(200);
    expect(listB.body.customers).toHaveLength(0);
  });
});

describe('invoices', () => {
  it('generates an invoice for an existing customer with a unique invoice number', async () => {
    const token = await signupAndGetToken('owner2@test.com');

    const customerRes = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Fatou Sarr', phone: '+221770000003', subscriptionFee: 15000 });

    const invoiceRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: customerRes.body.customer._id,
        amount: 15000,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

    expect(invoiceRes.status).toBe(201);
    expect(invoiceRes.body.invoice.invoiceNumber).toMatch(/^INV-/);
    expect(invoiceRes.body.invoice.status).toBe('pending');
  });

  it('rejects an invoice for a customer that does not belong to the requester', async () => {
    const tokenA = await signupAndGetToken('ownerC@test.com');
    const tokenB = await signupAndGetToken('ownerD@test.com');

    const customerRes = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ fullName: 'Customer of C', phone: '+221770000004', subscriptionFee: 15000 });

    const invoiceRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        customerId: customerRes.body.customer._id,
        amount: 5000,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

    expect(invoiceRes.status).toBe(404);
  });

  it('marks an invoice as paid and stamps paidAt', async () => {
    const token = await signupAndGetToken('owner3@test.com');

    const customerRes = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Ibrahima Fall', phone: '+221770000005', subscriptionFee: 15000 });

    const invoiceRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: customerRes.body.customer._id,
        amount: 20000,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

    const paidRes = await request(app)
      .patch(`/api/v1/invoices/${invoiceRes.body.invoice._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'paid' });

    expect(paidRes.status).toBe(200);
    expect(paidRes.body.invoice.status).toBe('paid');
    expect(paidRes.body.invoice.paidAt).not.toBeNull();
  });
});
