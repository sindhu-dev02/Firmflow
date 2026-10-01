import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/app';

describe('Login limit', () => {
  beforeAll(() => {
    process.env.TEST_RATE_LIMIT = 'on';
  });
  afterAll(() => {
    delete process.env.TEST_RATE_LIMIT;
  });

  it('blocks the 11th login attempt', async () => {
    const attempt = () =>
      request(app)
        .post('/api/auth/login')
        .send({ email: 'someone@example.com', password: 'WrongPassword999' });

    for (let i = 0; i < 10; i++) {
      const res = await attempt();
      expect(res.status).not.toBe(429);
    }

    const blocked = await attempt();
    expect(blocked.status).toBe(429);
  });
});