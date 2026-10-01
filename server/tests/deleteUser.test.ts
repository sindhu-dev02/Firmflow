import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import app from '../src/app';
import { User } from '../src/modules/users/user.model';
import { Order } from '../src/modules/order/order.model';
import { makeOrgAndUsers, makeToken, seedTestUsers } from './helpers';

async function deactivate(userId: string) {
  await User.collection.updateOne(
    { _id: new Types.ObjectId(userId) },
    { $set: { isActive: false } }
  );
}

describe('Deleting a team member', () => {
  let ctx: ReturnType<typeof makeOrgAndUsers>;

  beforeEach(async () => {
    ctx = makeOrgAndUsers();
    await seedTestUsers([ctx.owner, ctx.employee, ctx.customer, ctx.otherOrgOwner]);
  });

  const del = (id: string, token: string) =>
    request(app).delete(`/api/users/${id}`).set('Authorization', `Bearer ${token}`);

  it('does not let an employee delete anyone', async () => {
    await deactivate(ctx.customer.userId);
    const res = await del(ctx.customer.userId, makeToken(ctx.employee));
    expect(res.status).toBe(403);
  });

  it('asks the owner to deactivate first', async () => {
    const res = await del(ctx.employee.userId, makeToken(ctx.owner));
    expect(res.status).toBe(400);
    expect(await User.exists({ _id: ctx.employee.userId })).toBeTruthy();
  });

  it('lets the owner delete a deactivated employee', async () => {
    await deactivate(ctx.employee.userId);
    const res = await del(ctx.employee.userId, makeToken(ctx.owner));
    expect(res.status).toBe(200);
    expect(await User.exists({ _id: ctx.employee.userId })).toBeNull();
  });

  it('does not let the owner delete themselves', async () => {
    const res = await del(ctx.owner.userId, makeToken(ctx.owner));
    expect(res.status).toBe(400);
  });

  it('does not let an owner delete someone from another organization', async () => {
    await deactivate(ctx.employee.userId);
    const res = await del(ctx.employee.userId, makeToken(ctx.otherOrgOwner));
    expect(res.status).toBe(404);
    expect(await User.exists({ _id: ctx.employee.userId })).toBeTruthy();
  });

  it('keeps a customer who already has orders', async () => {
    await deactivate(ctx.customer.userId);
    await Order.collection.insertOne({
      organizationId: new Types.ObjectId(ctx.organizationId),
      customerId: new Types.ObjectId(ctx.customer.userId),
      createdBy: new Types.ObjectId(ctx.owner.userId),
      items: [],
      status: 'pending',
      totalAmount: 0,
    });
    const res = await del(ctx.customer.userId, makeToken(ctx.owner));
    expect(res.status).toBe(409);
    expect(await User.exists({ _id: ctx.customer.userId })).toBeTruthy();
  });
});