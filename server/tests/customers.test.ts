import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import app from '../src/app';
import { Order } from '../src/modules/order/order.model';
import { Plan } from '../src/modules/plan/plan.model';
import { Subscription } from '../src/modules/subscription/subscription.model';
import { User } from '../src/modules/users/user.model';
import { makeOrgAndUsers, makeToken, seedTestUsers } from './helpers';

describe('Customers list', () => {
  let ctx: ReturnType<typeof makeOrgAndUsers>;

  beforeEach(async () => {
    ctx = makeOrgAndUsers();
    await seedTestUsers([ctx.owner, ctx.employee, ctx.customer, ctx.otherOrgOwner]);
  });

  const list = (token: string) =>
    request(app).get('/api/users/customers').set('Authorization', `Bearer ${token}`);

  it('blocks a customer', async () => {
    const res = await list(makeToken(ctx.customer));
    expect(res.status).toBe(403);
  });

  it('lets an employee see customers, and only customers', async () => {
    const res = await list(makeToken(ctx.employee));
    expect(res.status).toBe(200);
    expect(res.body.data.customers).toHaveLength(1);
    expect(res.body.data.customers[0].role).toBe('customer');
  });

  it('does not show customers from another organization', async () => {
    const res = await list(makeToken(ctx.otherOrgOwner));
    expect(res.body.data.customers).toHaveLength(0);
  });

  it('counts orders and money spent, and ignores cancelled orders for money', async () => {
    const base = {
      organizationId: new Types.ObjectId(ctx.organizationId),
      customerId: new Types.ObjectId(ctx.customer.userId),
      createdBy: new Types.ObjectId(ctx.owner.userId),
      items: [],
    };
    await Order.collection.insertMany([
      { ...base, status: 'fulfilled', totalAmount: 10000, createdAt: new Date() },
      { ...base, status: 'pending', totalAmount: 5000, createdAt: new Date() },
      { ...base, status: 'cancelled', totalAmount: 99999, createdAt: new Date() },
    ]);

    const res = await list(makeToken(ctx.owner));
    const row = res.body.data.customers[0];
    expect(row.orderCount).toBe(3);
    expect(row.totalSpent).toBe(15000);
  });
});

describe('Inviting a customer when the employee seats are full', () => {
  it('still works, because customers do not use a seat', async () => {
    const ctx = makeOrgAndUsers();
    await seedTestUsers([ctx.owner, ctx.employee]);

    const plan = await Plan.create({
      name: 'Tiny',
      slug: `tiny-${Date.now()}`,
      billingCycle: 'monthly',
      price: 0,
      currency: 'INR',
      limits: { firms: 1, products: 5, employees: 1 }, // one employee already exists
    });
    await Subscription.create({
      organizationId: ctx.organizationId,
      planId: plan._id,
      status: 'active',
    });

    const token = makeToken(ctx.owner);

    const asEmployee = await request(app)
      .post('/api/users/invite')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Another Worker', email: `w-${Date.now()}@test.local`, password: 'password123', role: 'employee' });
    expect(asEmployee.status).toBe(403);

    const asCustomer = await request(app)
      .post('/api/users/invite')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'A Customer', email: `c-${Date.now()}@test.local`, password: 'password123', role: 'customer' });
    expect(asCustomer.status).toBe(201);
    expect(await User.countDocuments({ organizationId: ctx.organizationId, role: 'customer' })).toBeGreaterThan(0);
  });
});