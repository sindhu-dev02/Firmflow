import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { ActivityLog } from '../src/modules/activityLog/activityLog.model';
import { makeToken, makeOrgAndUsers, seedTestUsers } from './helpers';

describe('Activity log coverage', () => {
  let ctx: ReturnType<typeof makeOrgAndUsers>;
  let ownerToken: string;

  beforeEach(async () => {
    ctx = makeOrgAndUsers();
    await seedTestUsers([ctx.owner, ctx.customer]);
    ownerToken = makeToken(ctx.owner);
  });

  const actions = async () => (await ActivityLog.find({})).map((l) => l.action);

  it('records category created, renamed and deleted', async () => {
    const created = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Pens' });
    const id = created.body.category.id;

    await request(app)
      .patch(`/api/categories/${id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Writing' });

    await request(app)
      .delete(`/api/categories/${id}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(await actions()).toEqual(
      expect.arrayContaining(['category.created', 'category.renamed', 'category.deleted']),
    );
  });

  it('does not record a rename when the name is unchanged', async () => {
    const created = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Pens' });

    await request(app)
      .patch(`/api/categories/${created.body.category.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Pens' });

    expect(await actions()).not.toContain('category.renamed');
  });

  it('records a product edit', async () => {
    const created = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Pen', sku: 'PEN1', price: 1000, stock: 5 });

    await request(app)
      .patch(`/api/products/${created.body.product.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ stock: 9 });

    expect(await actions()).toContain('product.updated');
  });
});