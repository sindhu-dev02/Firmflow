export function serializeUser(user: {
  _id: any;
  name: string;
  email: string;
  role: string;
  organizationId?: any;
  isActive?: boolean;
}) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId ?? null,
    isActive: user.isActive ?? true,
  };
}