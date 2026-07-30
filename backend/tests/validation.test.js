import './setup.js';
import request from 'supertest';
import createApp from '../src/app.js';

const app = createApp();

const validSignup = {
  gymName: 'Iron Yard Gym',
  fullName: 'Awa Diop',
  email: 'awa@irongym.test',
  password: 'StrongPass123!',
};

async function signupAndGetToken(email) {
  const res = await request(app)
    .post('/api/v1/auth/signup')
    .send({ ...validSignup, email });
  return res.body.accessToken;
}

describe('request validation', () => {
  it('rejects an unknown field instead of silently ignoring it', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ ...validSignup, isAdmin: true });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('reports every invalid field at once with its name', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ gymName: '', fullName: 'A', email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toContain('gymName');
    expect(fields).toContain('email');
    expect(fields).toContain('password');
  });

  it('rejects an operator object where a string is expected', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });

    expect(res.status).toBe(400);
  });

  it('answers 400, not 500, for an object in a trimmed string field', async () => {
    const token = await signupAndGetToken('trimmed@test.com');

    const res = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: { $ne: null }, phone: { $gt: '' } });

    expect(res.status).toBe(400);
  });

  it('answers 400, not 500, for a malformed id', async () => {
    const token = await signupAndGetToken('badid@test.com');

    const res = await request(app)
      .get('/api/v1/customers/not-a-valid-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('rejects a negative invoice amount', async () => {
    const token = await signupAndGetToken('neg@test.com');
    const customer = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Member One', phone: '+221770000010', subscriptionFee: 15000 });

    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ customerId: customer.body.customer._id, amount: -5, dueDate: '2026-09-01' });

    expect(res.status).toBe(400);
  });

  it('normalises the email to lower case', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ ...validSignup, email: 'MiXeD@Case.TEST' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('mixed@case.test');
  });

  it('treats a blank optional email as absent, so two can coexist', async () => {
    const token = await signupAndGetToken('blank@test.com');

    const first = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'No Email One', email: '', phone: '+221770000011', subscriptionFee: 15000 });

    const second = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'No Email Two', email: '', phone: '+221770000012', subscriptionFee: 15000 });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.customer.email).toBeUndefined();
  });
});

describe('customer contact details and subscription fee', () => {
  it('requires a phone number', async () => {
    const token = await signupAndGetToken('nophone@test.com');

    const res = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'No Phone', subscriptionFee: 15000 });

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toContain('phone');
  });

  it('accepts a customer with a phone but no email', async () => {
    const token = await signupAndGetToken('phoneonly@test.com');

    const res = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Phone Only', phone: '+221770000301', subscriptionFee: 15000 });

    expect(res.status).toBe(201);
    expect(res.body.customer.phone).toBe('+221770000301');
    expect(res.body.customer.email).toBeUndefined();
  });

  it('stores the subscription fee against the customer', async () => {
    const token = await signupAndGetToken('fee@test.com');

    const res = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Annual Member',
        phone: '+221770000302',
        membershipPlan: 'annual',
        subscriptionFee: 180000,
      });

    expect(res.status).toBe(201);
    expect(res.body.customer.subscriptionFee).toBe(180000);
    expect(res.body.customer.membershipPlan).toBe('annual');
  });

  it('requires a fee on a recurring plan', async () => {
    const token = await signupAndGetToken('nofee@test.com');

    const res = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Monthly Member', phone: '+221770000303', membershipPlan: 'monthly' });

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toContain('subscriptionFee');
  });

  it('allows pay as you go without a fee', async () => {
    const token = await signupAndGetToken('payg@test.com');

    const res = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Drop In',
        phone: '+221770000304',
        membershipPlan: 'pay_as_you_go',
      });

    expect(res.status).toBe(201);
    expect(res.body.customer.subscriptionFee).toBeUndefined();
  });

  it('rejects a negative fee', async () => {
    const token = await signupAndGetToken('negfee@test.com');

    const res = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Bad Fee', phone: '+221770000305', subscriptionFee: -1 });

    expect(res.status).toBe(400);
  });
});

describe('pagination', () => {
  it('caps a page at the requested limit and reports the total', async () => {
    const token = await signupAndGetToken('page@test.com');

    for (const [index, name] of ['One', 'Two', 'Three'].entries()) {
      await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: `Member ${name}`,
          phone: `+22177000020${index}`,
          subscriptionFee: 15000,
        });
    }

    const res = await request(app)
      .get('/api/v1/customers?limit=2&page=1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.customers).toHaveLength(2);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 2, total: 3, pages: 2 });
  });

  it('rejects a limit above the maximum', async () => {
    const token = await signupAndGetToken('bigpage@test.com');

    const res = await request(app)
      .get('/api/v1/customers?limit=5000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

describe('refresh token rotation', () => {
  it('revokes the whole session family when a rotated token is replayed', async () => {
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({ ...validSignup, email: 'rotate@test.com', rememberMe: true });

    const firstCookie = signupRes.headers['set-cookie'];

    const rotated = await request(app).post('/api/v1/auth/refresh').set('Cookie', firstCookie);
    expect(rotated.status).toBe(200);
    const secondCookie = rotated.headers['set-cookie'];

    const replay = await request(app).post('/api/v1/auth/refresh').set('Cookie', firstCookie);
    expect(replay.status).toBe(401);

    const afterBreach = await request(app).post('/api/v1/auth/refresh').set('Cookie', secondCookie);
    expect(afterBreach.status).toBe(401);
  });

  it('revokes the refresh token on logout', async () => {
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({ ...validSignup, email: 'logout@test.com' });
    const cookie = signupRes.headers['set-cookie'];

    const loggedOut = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);
    expect(loggedOut.status).toBe(204);

    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });
});

describe('health', () => {
  it('reports status, uptime and version', async () => {
    const res = await request(app).get('/api/v1/_health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.version).toBeDefined();
  });
});
