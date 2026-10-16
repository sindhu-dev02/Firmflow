import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/app';
import { User } from '../src/modules/users/user.model';
import { makeOrgAndUsers, makeToken, seedTestUsers } from './helpers';

describe('Editing a team member or customer', () => {
  let ctx: ReturnType<typeof makeOrgAndUsers>;

  beforeEach(async () => {
    ctx = makeOrgAndUsers();
    await seedTestUsers([ctx.owner, ctx.employee, ctx.customer, ctx.otherOrgOwner]);
  });

  const edit = (id: string, token: string, body: object) =>
    request(app).patch(`/api/users/${id}`).set('Authorization', `Bearer ${token}`).send(body);

  it('lets the owner change an employee name and email', async () => {
    const res = await edit(ctx.employee.userId, makeToken(ctx.owner), {
      name: 'New Name',
      email: 'New.Email@Test.Local',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('New Name');
    expect(res.body.data.user.email).toBe('new.email@test.local');
    const saved = await User.findById(ctx.employee.userId);
    expect(saved?.name).toBe('New Name');
  });

  it('lets the owner change a customer', async () => {
    const res = await edit(ctx.customer.userId, makeToken(ctx.owner), { name: 'Renamed Customer' });
    expect(res.status).toBe(200);
  });

  it('lets an employee change a customer', async () => {
    const res = await edit(ctx.customer.userId, makeToken(ctx.employee), { name: 'By Employee' });
    expect(res.status).toBe(200);
    expect((await User.findById(ctx.customer.userId))?.name).toBe('By Employee');
  });

  it('does not let an employee change another employee or the owner', async () => {
    const other = await edit(ctx.owner.userId, makeToken(ctx.employee), { name: 'Nope Owner' });
    expect(other.status).toBe(403);
    expect((await User.findById(ctx.owner.userId))?.name).toBe('Test org_owner');
  });

  it('does not let a customer edit anyone', async () => {
    const res = await edit(ctx.employee.userId, makeToken(ctx.customer), { name: 'Nope Name' });
    expect(res.status).toBe(403);
  });

  it('does not let the owner edit themselves here', async () => {
    const res = await edit(ctx.owner.userId, makeToken(ctx.owner), { name: 'Self Edit' });
    expect(res.status).toBe(400);
  });

  it('does not let anyone edit a person in another organization', async () => {
    const res = await edit(ctx.employee.userId, makeToken(ctx.otherOrgOwner), { name: 'Cross Org' });
    expect(res.status).toBe(404);
    expect((await User.findById(ctx.employee.userId))?.name).toBe('Test employee');
  });

  it('refuses an email that another user already has', async () => {
    const taken = (await User.findById(ctx.customer.userId))!.email;
    const res = await edit(ctx.employee.userId, makeToken(ctx.owner), { email: taken });
    expect(res.status).toBe(409);
  });

  it('allows saving the same email again without an error', async () => {
    const same = (await User.findById(ctx.employee.userId))!.email;
    const res = await edit(ctx.employee.userId, makeToken(ctx.owner), { email: same });
    expect(res.status).toBe(200);
  });

  it('rejects a bad email, a short name and an empty request', async () => {
    const t = makeToken(ctx.owner);
    expect((await edit(ctx.employee.userId, t, { email: 'not-an-email' })).status).toBe(400);
    expect((await edit(ctx.employee.userId, t, { name: 'A' })).status).toBe(400);
    expect((await edit(ctx.employee.userId, t, {})).status).toBe(400);
  });
});

describe('Who can invite', () => {
  let ctx: ReturnType<typeof makeOrgAndUsers>;

  beforeEach(async () => {
    ctx = makeOrgAndUsers();
    await seedTestUsers([ctx.owner, ctx.employee]);
  });

  const invite = (token: string, role: string) =>
    request(app)
      .post('/api/users/invite')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Someone New',
        email: `new-${role}-${Date.now()}@test.local`,
        password: 'password123',
        role,
      });

  it('stops an employee from adding an employee', async () => {
    const res = await invite(makeToken(ctx.employee), 'employee');
    expect(res.status).toBe(403);
  });

  it('still lets an employee add a customer', async () => {
    const res = await invite(makeToken(ctx.employee), 'customer');
    expect(res.status).toBe(201);
  });

  it('still lets the owner add an employee', async () => {
    const res = await invite(makeToken(ctx.owner), 'employee');
    expect(res.status).toBe(201);
  });
});