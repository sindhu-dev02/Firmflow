import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { User } from '../src/modules/users/user.model';

export interface TestUserPayload {
  userId: string;
  role: 'super_admin' | 'org_owner' | 'employee' | 'customer';
  organizationId?: string;
}

export function makeToken(payload: TestUserPayload): string {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, { expiresIn: '15m' });
}

export function makeOrgAndUsers() {
  const organizationId = new Types.ObjectId().toString();
  const otherOrganizationId = new Types.ObjectId().toString();

  const owner: TestUserPayload = { userId: new Types.ObjectId().toString(), organizationId, role: 'org_owner' };
  const employee: TestUserPayload = { userId: new Types.ObjectId().toString(), organizationId, role: 'employee' };
  const customer: TestUserPayload = { userId: new Types.ObjectId().toString(), organizationId, role: 'customer' };
  const otherOrgOwner: TestUserPayload = { userId: new Types.ObjectId().toString(), organizationId: otherOrganizationId, role: 'org_owner' };

  return { organizationId, otherOrganizationId, owner, employee, customer, otherOrgOwner };
}

// Puts the fake users into the test database, so the server can find them
export async function seedTestUsers(users: TestUserPayload[]) {
  await User.collection.bulkWrite(
    users.map((u) => ({
      replaceOne: {
        filter: { _id: new Types.ObjectId(u.userId) },
        replacement: {
          _id: new Types.ObjectId(u.userId),
          name: `Test ${u.role}`,
          email: `${u.role}-${u.userId}@test.local`,
          role: u.role,
          ...(u.organizationId && {
            organizationId: new Types.ObjectId(u.organizationId),
          }),
          isActive: true,
        },
        upsert: true,
      },
    }))
  );
}