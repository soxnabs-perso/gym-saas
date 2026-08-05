import './setup.js';
import request from 'supertest';
import createApp from '../src/app.js';
import Invoice from '../src/models/Invoice.js';

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

async function createCustomer(token) {
  const res = await request(app)
    .post('/api/v1/customers')
    .set(auth(token))
    .send({ fullName: 'Moussa Ndiaye', phone: '+221770000001', subscriptionFee: 20000 });
  return res.body.customer._id;
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('idempotent invoice creation', () => {
  it('raises one invoice when the same key is sent twice', async () => {
    const token = await signupAndGetToken('idem1@test.com');
    const customerId = await createCustomer(token);
    const body = { customerId, amount: 15000, dueDate: daysFromNow(7) };

    const first = await request(app)
      .post('/api/v1/invoices')
      .set(auth(token))
      .set('Idempotency-Key', 'a1b2c3d4-retry-once')
      .send(body);

    const second = await request(app)
      .post('/api/v1/invoices')
      .set(auth(token))
      .set('Idempotency-Key', 'a1b2c3d4-retry-once')
      .send(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.headers['idempotency-replayed']).toBe('true');
    expect(second.body.invoice._id).toBe(first.body.invoice._id);
    expect(second.body.invoice.invoiceNumber).toBe(first.body.invoice.invoiceNumber);

    expect(await Invoice.countDocuments({})).toBe(1);
  });

  it('raises two invoices when no key is sent', async () => {
    const token = await signupAndGetToken('idem2@test.com');
    const customerId = await createCustomer(token);
    const body = { customerId, amount: 15000, dueDate: daysFromNow(7) };

    await request(app).post('/api/v1/invoices').set(auth(token)).send(body);
    await request(app).post('/api/v1/invoices').set(auth(token)).send(body);

    expect(await Invoice.countDocuments({})).toBe(2);
  });

  it('refuses a key that was already used for a different request', async () => {
    const token = await signupAndGetToken('idem3@test.com');
    const customerId = await createCustomer(token);

    await request(app)
      .post('/api/v1/invoices')
      .set(auth(token))
      .set('Idempotency-Key', 'reused-key-0001')
      .send({ customerId, amount: 15000, dueDate: daysFromNow(7) });

    const different = await request(app)
      .post('/api/v1/invoices')
      .set(auth(token))
      .set('Idempotency-Key', 'reused-key-0001')
      .send({ customerId, amount: 99000, dueDate: daysFromNow(7) });

    expect(different.status).toBe(422);
    expect(await Invoice.countDocuments({})).toBe(1);
  });

  it('creates only one invoice when two retries arrive at the same moment', async () => {
    const token = await signupAndGetToken('idem4@test.com');
    const customerId = await createCustomer(token);
    const body = { customerId, amount: 15000, dueDate: daysFromNow(7) };

    const send = () =>
      request(app)
        .post('/api/v1/invoices')
        .set(auth(token))
        .set('Idempotency-Key', 'concurrent-key-01')
        .send(body);

    const results = await Promise.all([send(), send(), send()]);
    const statuses = results.map((r) => r.status).sort();

    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409 || s === 201)).toHaveLength(3);
    expect(await Invoice.countDocuments({})).toBe(1);
  });

  it('does not burn the key when the request fails, so it can be corrected and retried', async () => {
    const token = await signupAndGetToken('idem5@test.com');
    const customerId = await createCustomer(token);

    const rejected = await request(app)
      .post('/api/v1/invoices')
      .set(auth(token))
      .set('Idempotency-Key', 'recoverable-key-1')
      .send({ customerId: 'aaaaaaaaaaaaaaaaaaaaaaaa', amount: 15000, dueDate: daysFromNow(7) });
    expect(rejected.status).toBe(404);

    const corrected = await request(app)
      .post('/api/v1/invoices')
      .set(auth(token))
      .set('Idempotency-Key', 'recoverable-key-1')
      .send({ customerId, amount: 15000, dueDate: daysFromNow(7) });

    expect(corrected.status).toBe(201);
  });

  it('does not let one manager replay another manager\'s key', async () => {
    const tokenA = await signupAndGetToken('idemA@test.com');
    const tokenB = await signupAndGetToken('idemB@test.com');
    const customerA = await createCustomer(tokenA);
    const customerB = await createCustomer(tokenB);

    await request(app)
      .post('/api/v1/invoices')
      .set(auth(tokenA))
      .set('Idempotency-Key', 'shared-key-value')
      .send({ customerId: customerA, amount: 15000, dueDate: daysFromNow(7) });

    const b = await request(app)
      .post('/api/v1/invoices')
      .set(auth(tokenB))
      .set('Idempotency-Key', 'shared-key-value')
      .send({ customerId: customerB, amount: 22000, dueDate: daysFromNow(7) });

    expect(b.status).toBe(201);
    expect(await Invoice.countDocuments({})).toBe(2);
  });

  it('rejects a malformed key', async () => {
    const token = await signupAndGetToken('idem6@test.com');
    const customerId = await createCustomer(token);

    const res = await request(app)
      .post('/api/v1/invoices')
      .set(auth(token))
      .set('Idempotency-Key', 'short')
      .send({ customerId, amount: 15000, dueDate: daysFromNow(7) });

    expect(res.status).toBe(400);
    expect(await Invoice.countDocuments({})).toBe(0);
  });

  it('does not consume a key when the payload fails validation', async () => {
    const token = await signupAndGetToken('idem7@test.com');
    const customerId = await createCustomer(token);

    const invalid = await request(app)
      .post('/api/v1/invoices')
      .set(auth(token))
      .set('Idempotency-Key', 'validation-key-01')
      .send({ customerId, amount: -5, dueDate: daysFromNow(7) });
    expect(invalid.status).toBe(400);

    const fixed = await request(app)
      .post('/api/v1/invoices')
      .set(auth(token))
      .set('Idempotency-Key', 'validation-key-01')
      .send({ customerId, amount: 15000, dueDate: daysFromNow(7) });

    expect(fixed.status).toBe(201);
  });
});

describe('method not allowed', () => {
  it('answers 405 with Allow when the path exists under other methods', async () => {
    const token = await signupAndGetToken('method1@test.com');
    const customerId = await createCustomer(token);

    const res = await request(app).put(`/api/v1/customers/${customerId}`).set(auth(token));

    expect(res.status).toBe(405);
    expect(res.headers.allow.split(', ')).toEqual(
      expect.arrayContaining(['GET', 'HEAD', 'OPTIONS', 'PATCH'])
    );
  });

  it('still answers 404 when the path does not exist at all', async () => {
    const res = await request(app).get('/api/v1/nonexistent');

    expect(res.status).toBe(404);
    expect(res.headers.allow).toBeUndefined();
  });

  it('reports the right methods on a collection', async () => {
    const token = await signupAndGetToken('method3@test.com');

    const res = await request(app).patch('/api/v1/invoices').set(auth(token));

    expect(res.status).toBe(405);
    expect(res.headers.allow.split(', ')).toEqual(
      expect.arrayContaining(['GET', 'POST'])
    );
    expect(res.headers.allow).not.toContain('PATCH');
  });

  /**
   * Invoices are financial records, so there is deliberately no delete: cancelling with a reason is the one way to
   * retire one.
   *
   * This answers 404 rather than 405 because `/invoices/{id}` is not a route at all — the only thing registered
   * under an invoice id is `/status`. 405 would claim the resource exists and merely refuses the method, which is
   * not true here. It would become a 405 the day a `GET /invoices/{id}` is added.
   */
  it('offers no way to delete an invoice', async () => {
    const token = await signupAndGetToken('method4@test.com');
    const customerId = await createCustomer(token);

    const created = await request(app)
      .post('/api/v1/invoices')
      .set(auth(token))
      .send({ customerId, amount: 15000, dueDate: daysFromNow(7) });

    const res = await request(app)
      .delete(`/api/v1/invoices/${created.body.invoice._id}`)
      .set(auth(token));

    expect(res.status).toBe(404);
    expect(res.headers.allow).toBeUndefined();
  });

  it('still reports 405 on the invoice status sub-resource, which does exist', async () => {
    const token = await signupAndGetToken('method5@test.com');
    const customerId = await createCustomer(token);

    const created = await request(app)
      .post('/api/v1/invoices')
      .set(auth(token))
      .send({ customerId, amount: 15000, dueDate: daysFromNow(7) });

    const res = await request(app)
      .delete(`/api/v1/invoices/${created.body.invoice._id}/status`)
      .set(auth(token));

    expect(res.status).toBe(405);
    expect(res.headers.allow).toContain('PATCH');
  });

  it('reports 405 on an action sub-resource asked with the wrong method', async () => {
    const token = await signupAndGetToken('method2@test.com');
    const customerId = await createCustomer(token);

    const res = await request(app)
      .get(`/api/v1/customers/${customerId}/archive`)
      .set(auth(token));

    expect(res.status).toBe(405);
    expect(res.headers.allow).toContain('POST');
  });

  it('answers 405 on a public route without needing a token', async () => {
    const res = await request(app).delete('/api/v1/auth/login');

    expect(res.status).toBe(405);
    expect(res.headers.allow).toContain('POST');
  });

  /**
   * The router-level `protect` guard covers the whole subtree, including paths that match no route, so an anonymous
   * caller is turned away before the method is ever considered. That ordering is deliberate: answering 405 first
   * would let anyone map which endpoints exist without holding a token.
   */
  it('answers 401 rather than 405 on a protected route, so the route map stays private', async () => {
    const res = await request(app).patch('/api/v1/invoices');

    expect(res.status).toBe(401);
    expect(res.headers.allow).toBeUndefined();
  });
});
