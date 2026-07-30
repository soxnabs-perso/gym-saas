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

describe('auth flow', () => {
  it('signs up a new manager and returns an access token plus a refresh cookie', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send(validSignup);

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe(validSignup.email);
    expect(res.headers['set-cookie'][0]).toMatch(/refreshToken=/);
  });

  it('rejects signup with a password shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ ...validSignup, password: 'short' });

    expect(res.status).toBe(400);
  });

  it('rejects a duplicate email on signup', async () => {
    await request(app).post('/api/v1/auth/signup').send(validSignup);
    const res = await request(app).post('/api/v1/auth/signup').send(validSignup);

    expect(res.status).toBe(409);
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    await request(app).post('/api/v1/auth/signup').send(validSignup);

    const good = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validSignup.email, password: validSignup.password });
    expect(good.status).toBe(200);
    expect(good.body.accessToken).toBeDefined();

    const bad = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validSignup.email, password: 'wrongpassword' });
    expect(bad.status).toBe(401);
  });

  it('blocks access to a protected route without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('allows access to a protected route with a valid access token', async () => {
    const signupRes = await request(app).post('/api/v1/auth/signup').send(validSignup);
    const token = signupRes.body.accessToken;

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validSignup.email);
  });
});
