import { Request, Response } from "express";
import { User } from "./user.model";
import { catchAsync } from "../../shared/utils/catchAsync";
import { AppError } from "../../middlewares/errorHandler";
import { serializeUser } from "../../shared/utils/serializeUser";
import { tenantFilter } from "../../shared/helpers/tenantFilter";
import { hashPassword } from "../../shared/utils/password";
import { logActivity } from "../../shared/utils/logActivity";
import { Order } from "../order/order.model";

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