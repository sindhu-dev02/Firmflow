import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/app';
import { User } from '../src/modules/users/user.model';
import { makeOrgAndUsers, makeToken, seedTestUsers } from './helpers';

describe('Who can see the team list', () => {
  let ctx: ReturnType<typeof makeOrgAndUsers>;

  beforeEach(async () => {
    ctx = makeOrgAndUsers();
    await seedTestUsers([ctx.owner, ctx.employee, ctx.customer]);
  });

  it('blocks people who are not logged in', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('blocks a customer from listing employees', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${makeToken(ctx.customer)}`);
    expect(res.status).toBe(403);
  });

  it('lets the owner see the team list', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${makeToken(ctx.owner)}`);
    expect(res.status).toBe(200);
  });

  it('stops a deactivated user right away, even with a valid token', async () => {
    await User.collection.updateOne(
      { _id: new (await import('mongoose')).Types.ObjectId(ctx.employee.userId) },
      { $set: { isActive: false } }
    );
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${makeToken(ctx.employee)}`);
    expect(res.status).toBe(403);
  });
});