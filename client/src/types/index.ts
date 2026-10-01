export type Role = 'super_admin' | 'org_owner' | 'employee' | 'customer';

export interface User {
  isActive: any;
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string | null;
  createdAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  firmId: string | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  mustChangePassword: boolean;
}

export interface DashboardBusiness {
  counts: {
    products: number;
    activeProducts: number;
    customers: number;
    orders: number;
    pendingOrders: number;
  };
  totalRevenue: number; // paise
  last7Days: { date: string; revenue: number; orders: number }[];
  recentOrders: {
    id: string;
    status: 'pending' | 'confirmed' | 'fulfilled' | 'cancelled';
    totalAmount: number;
    itemCount: number;
    createdAt: string;
  }[];
  lowStock: { id: string; name: string; sku: string; stock: number }[];
  usage: {
    planName: string | null;
    products: { used: number; limit: number }; // limit -1 = unlimited
    employees: { used: number; limit: number };
  };
}

// `business` is only sent to the owner and employees, not customers
export interface DashboardData {
  organization: { id: string; name: string; slug: string };
  stats: { memberCount: number; createdAt: string };
  business?: DashboardBusiness;
}

// Generic shape for your backend's error responses (AppError-based)
export interface ApiErrorPayload {
  status: string;
  message: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

export interface TeamResponse {
  users: TeamMember[];
}

// --- Phase 3: Billing ---

export type BillingCycle = 'monthly' | 'yearly';

export interface PlanLimits {
  firms: number;
  products: number;
  employees: number;
}

export interface PlanFeatures {
  reports: boolean;
  analytics: boolean;
  customBranding: boolean;
  apiAccess: boolean;
  auditLogs: boolean;
  prioritySupport: boolean;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  billingCycle: BillingCycle;
  price: number; // paise (1/100 INR) — divide by 100 to display
  currency: string;
  limits: PlanLimits;
  features: PlanFeatures;
  trialDays: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type SubscriptionStatus = 'created' | 'trialing' | 'active' | 'past_due' | 'cancelled';

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  // Only null if the plan was hard-deleted after the subscription was
  // created — the serializer's plan lookup came back empty. Doesn't
  // happen through normal use (plans soft-delete), but the type is honest.
  plan: Plan | null;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type InvoiceStatus = 'paid' | 'failed' | string;

export interface Invoice {
  id: string;
  organizationId: string;
  subscriptionId: string;
  planId: string;
  amount: number; // paise
  currency: string;
  status: InvoiceStatus;
  periodStart: string | null;
  periodEnd: string | null;
  pdfUrl: string | null;
  createdAt: string;
}

export interface Product {
  id: string;
  categoryId: string | null;
  name: string;
  sku: string;
  description: string;
  price: number;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  actor: { id: string; name: string; email: string } | null;
  createdAt: string;
}