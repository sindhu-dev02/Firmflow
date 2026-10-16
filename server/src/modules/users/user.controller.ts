import { Request, Response } from "express";
import { User } from "./user.model";
import { catchAsync } from "../../shared/utils/catchAsync";
import { AppError } from "../../middlewares/errorHandler";
import { serializeUser } from "../../shared/utils/serializeUser";
import { tenantFilter } from "../../shared/helpers/tenantFilter";
import { hashPassword } from "../../shared/utils/password";
import { logActivity } from "../../shared/utils/logActivity";
import { Order } from "../order/order.model";
import { Types } from "mongoose";

export const getProfile = catchAsync(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        //mustChangePassword: user.mustChangePassword,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    },
  }); 
});

export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const { name } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user!.userId,
    { name },
    { new: true, runValidators: true }
  );
  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.status(200).json({
    success: true,
    data: {
      user: serializeUser(user),
    },
  });
});

export const listOrgUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await User.find(tenantFilter(req)).sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    data: {
      users: users.map(serializeUser),
    },
  });
});

export const inviteUser = catchAsync(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  const organizationId = req.user!.organizationId;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError("A user with this email already exists", 409);
  }

  const hashedPassword = await hashPassword(password);

  const newUser = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    organizationId,
    mustChangePassword: true,
  });

  await logActivity(req, {
    action: 'user.invited',
    targetType: 'user',
    targetId: String(newUser._id),
    metadata: { name: newUser.name, role: newUser.role },
  });

  res.status(201).json({
    success: true,
    data: { user: serializeUser(newUser) },
  });
});

export const deactivateUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const currentUserId = req.user!.userId;
  const organizationId = req.user!.organizationId;

  // 1. Block targeting yourself
  if (id === currentUserId) {
    throw new AppError("You cannot deactivate your own account", 400);
  }

  // 2. Find target user within the same organization
  const targetUser = await User.findOne({ _id: id, organizationId });
  if (!targetUser) {
    throw new AppError("User not found", 404);
  }

  // 3. Block targeting another organization owner
  if (targetUser.role === "org_owner") {
    throw new AppError("You cannot deactivate another organization owner", 403);
  }

  targetUser.isActive = false;
  await targetUser.save();

  await logActivity(req, {
    action: 'user.deactivated',
    targetType: 'user',
    targetId: String(targetUser._id),
    metadata: { name: targetUser.name },
  });

  res.status(200).json({
    success: true,
    data: { user: serializeUser(targetUser) },
  });
});

export const reactivateUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const organizationId = req.user!.organizationId;

  // Find target user within the same organization
  const targetUser = await User.findOne({ _id: id, organizationId });
  if (!targetUser) {
    throw new AppError("User not found", 404);
  }

  targetUser.isActive = true;
  await targetUser.save();

  await logActivity(req, {
    action: 'user.reactivated',
    targetType: 'user',
    targetId: String(targetUser._id),
    metadata: { name: targetUser.name },
  });

  res.status(200).json({
    success: true,
    data: { user: serializeUser(targetUser) },
  });
});

export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const currentUserId = req.user!.userId;
  const organizationId = req.user!.organizationId;

  if (id === currentUserId) {
    throw new AppError("You cannot delete your own account", 400);
  }

  const targetUser = await User.findOne({ _id: id, organizationId });
  if (!targetUser) {
    throw new AppError("User not found", 404);
  }

  if (targetUser.role === "org_owner") {
    throw new AppError("You cannot delete an organization owner", 403);
  }

  if (targetUser.isActive) {
    throw new AppError("Deactivate this person first, then delete", 400);
  }

  if (targetUser.role === "customer") {
    const hasOrders = await Order.exists({ organizationId, customerId: targetUser._id });
    if (hasOrders) {
      throw new AppError(
        "This customer has orders, so they cannot be deleted. Keep them deactivated instead.",
        409
      );
    }
  }

  await targetUser.deleteOne();

  await logActivity(req, {
    action: "user.deleted",
    targetType: "user",
    targetId: String(targetUser._id),
    metadata: { name: targetUser.name, role: targetUser.role },
  });

  res.status(200).json({ success: true, data: { id: String(targetUser._id) } });
});

  export const listCustomers = catchAsync(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId!;

    const customers = await User.find({ organizationId, role: "customer" }).sort({ createdAt: -1 });

    const stats = await Order.aggregate([
      { $match: { organizationId: new Types.ObjectId(organizationId) } },
      {
        $group: {
          _id: "$customerId",
          orderCount: { $sum: 1 },
          totalSpent: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 0, "$totalAmount"] },
          },
          lastOrderAt: { $max: "$createdAt" },
        },
      },
    ]);
    const statsById = new Map(stats.map((s) => [String(s._id), s]));

    res.status(200).json({
      success: true,
      data: {
        customers: customers.map((c) => {
          const st = statsById.get(String(c._id));
          return {
            ...serializeUser(c),
            createdAt: c.createdAt,
            orderCount: st?.orderCount ?? 0,
            totalSpent: st?.totalSpent ?? 0,
            lastOrderAt: st?.lastOrderAt ?? null,
          };
        }),
      },
    });
  });

// Change a person's name or email.
//  - the owner can edit employees and customers
//  - an employee can edit customers only
//  - nobody edits themselves here (use the Profile page) and nobody edits an owner
export const updateMember = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const actor = req.user!;
  const organizationId = actor.organizationId;
  const body = req.body as { name?: string; email?: string };
  const name = body.name?.trim();
  const email = body.email?.trim();

  if (id === actor.userId) {
    throw new AppError("Edit your own details on the Profile page", 400);
  }

  const target = await User.findOne({ _id: id, organizationId });
  if (!target) {
    throw new AppError("User not found", 404);
  }

  if (target.role === "org_owner") {
    throw new AppError("You cannot edit an organization owner", 403);
  }

  if (actor.role === "employee" && target.role !== "customer") {
    throw new AppError("Only the owner can edit team members", 403);
  }

  const changed: string[] = [];

  if (name !== undefined && name !== target.name) {
    target.name = name;
    changed.push("name");
  }

  if (email !== undefined) {
    const newEmail = email.toLowerCase();
    if (newEmail !== target.email) {
      const taken = await User.exists({ email: newEmail, _id: { $ne: target._id } });
      if (taken) {
        throw new AppError("A user with this email already exists", 409);
      }
      target.email = newEmail;
      changed.push("email");
    }
  }

  if (changed.length > 0) {
    await target.save();

    await logActivity(req, {
      action: "user.updated",
      targetType: "user",
      targetId: String(target._id),
      metadata: { name: target.name, role: target.role, changed },
    });
  }

  res.status(200).json({
    success: true,
    data: { user: serializeUser(target) },
  });
});