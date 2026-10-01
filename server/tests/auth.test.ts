import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../src/app';

const newUser = {
  name: 'Test Person',
  email: 'test.person@example.com',
  password: 'GoodPassword123',
};

describe('Register and login', () => {
  it('registers a new user', async () => {
    const res = await request(app).post('/api/auth/register').send(newUser);
    expect([200, 201]).toContain(res.status);
  });

  it('rejects a password that is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...newUser, password: 'short' });
    expect(res.status).toBe(400);
  });

  it('rejects an email that is already used', async () => {
    await request(app).post('/api/auth/register').send(newUser);
    const res = await request(app).post('/api/auth/register').send(newUser);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('logs in with the right password', async () => {
    await request(app).post('/api/auth/register').send(newUser);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: newUser.email, password: newUser.password });
    expect(res.status).toBe(200);
  });

  it('rejects the wrong password', async () => {
    await request(app).post('/api/auth/register').send(newUser);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: newUser.email, password: 'WrongPassword999' });
    expect(res.status).toBe(401);
  });

  it('rejects an email that does not exist', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Whatever12345' });
    expect(res.status).toBe(401);
  });
});