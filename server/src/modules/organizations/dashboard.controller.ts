import { Request, Response } from "express";
import { Types } from "mongoose";
import { Organization } from "./organization.model";
import { User } from "../users/user.model";
import { Product } from "../product/product.model";
import { Order } from "../order/order.model";
import { Subscription } from "../subscription/subscription.model";
import { Plan } from "../plan/plan.model";
import { catchAsync } from "../../shared/utils/catchAsync";
import { AppError } from "../../middlewares/errorHandler";

const LOW_STOCK_LIMIT = 5;
const TZ = "Asia/Kolkata";

// "2026-10-01" style key for a date, in Indian time
function dayKey(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

export const getDashboardSummary = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  if (!organizationId) {
    throw new AppError("No organization context found", 403);
  }

  const orgObjectId = new Types.ObjectId(organizationId);
  const isStaff = req.user!.role === "org_owner" || req.user!.role === "employee";

  const [organization, memberCount] = await Promise.all([
    Organization.findById(organizationId),
    User.countDocuments({ organizationId, role: { $ne: "customer" } }),
  ]);

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  const base = {
    organization: { id: organization.id, name: organization.name, slug: organization.slug },
    stats: { memberCount, createdAt: organization.createdAt },
  };

  // Customers only get the basics above
  if (!isStaff) {
    res.status(200).json({ success: true, data: base });
    return;
  }

  const since = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

  const [
    productCount,
    activeProductCount,
    employeeCount,
    customerCount,
    orderCount,
    pendingOrderCount,
    revenueAgg,
    dailyAgg,
    recentOrders,
    lowStock,
    subscription,
  ] = await Promise.all([
    Product.countDocuments({ organizationId }),
    Product.countDocuments({ organizationId, isActive: true }),
    User.countDocuments({ organizationId, role: "employee" }),
    User.countDocuments({ organizationId, role: "customer" }),
    Order.countDocuments({ organizationId }),
    Order.countDocuments({ organizationId, status: "pending" }),
    Order.aggregate([
      { $match: { organizationId: orgObjectId, status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.aggregate([
      { $match: { organizationId: orgObjectId, status: { $ne: "cancelled" }, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
    ]),
    Order.find({ organizationId }).sort({ createdAt: -1 }).limit(5),
    Product.find({ organizationId, isActive: true, stock: { $lte: LOW_STOCK_LIMIT } })
      .sort({ stock: 1 })
      .limit(5),
    Subscription.findOne({ organizationId }),
  ]);

  // Last 7 days, with zeros on days that had no orders
  const byDay = new Map<string, { revenue: number; orders: number }>(
    dailyAgg.map((d: { _id: string; revenue: number; orders: number }) => [d._id, d])
  );
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const key = dayKey(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
    const found = byDay.get(key);
    last7Days.push({ date: key, revenue: found?.revenue ?? 0, orders: found?.orders ?? 0 });
  }

  // Plan usage (-1 means unlimited)
  const plan = subscription ? await Plan.findById(subscription.planId) : null;
  const usage = {
    planName: plan?.name ?? null,
    products: { used: productCount, limit: plan?.limits.products ?? -1 },
    employees: { used: employeeCount, limit: plan?.limits.employees ?? -1 },
  };

  res.status(200).json({
    success: true,
    data: {
      ...base,
      business: {
        counts: {
          products: productCount,
          activeProducts: activeProductCount,
          customers: customerCount,
          orders: orderCount,
          pendingOrders: pendingOrderCount,
        },
        totalRevenue: revenueAgg[0]?.total ?? 0,
        last7Days,
        recentOrders: recentOrders.map((o) => ({
          id: o._id.toString(),
          status: o.status,
          totalAmount: o.totalAmount,
          itemCount: o.items.length,
          createdAt: o.createdAt,
        })),
        lowStock: lowStock.map((p) => ({
          id: p._id.toString(),
          name: p.name,
          sku: p.sku,
          stock: p.stock,
        })),
        usage,
      },
    },
  });
});