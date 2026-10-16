import { Router } from "express";
import { 
  getProfile, 
  updateProfile, 
  listOrgUsers, 
  inviteUser, 
  deactivateUser, 
  reactivateUser,
  deleteUser,
  listCustomers,
  updateMember
} from "./user.controller";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import { updateProfileSchema, inviteUserSchema, updateMemberSchema } from "./user.validation";
import { AppError } from "../../middlewares/errorHandler";
import { requireTenant } from "../../middlewares/tenantScope";
import { authorize } from "../../middlewares/authorize";
import { checkPlanLimit } from "../../middlewares/checkPlanLimit";

const router = Router();

router.use(authenticate);

router.get("/profile", getProfile);
router.patch("/profile", validate(updateProfileSchema), updateProfile);

router.get("/", requireTenant, authorize("org_owner", "employee"), listOrgUsers);

router.get("/customers", requireTenant, authorize("org_owner", "employee"), listCustomers);

// Only new employees use up a seat. Customers are free to add.
const employeeSeatLimit = checkPlanLimit('employees');

router.post(
  "/invite",
  requireTenant,
  authorize("org_owner", "employee"),
  validate(inviteUserSchema),
  // Only the owner can add staff. Employees can still add customers.
  (req, _res, next) =>
    req.body.role === 'employee' && req.user!.role !== 'org_owner'
      ? next(new AppError("Only the owner can add team members", 403))
      : next(),
  (req, res, next) =>
    req.body.role === 'employee' ? employeeSeatLimit(req, res, next) : next(),
  inviteUser
);

router.patch(
  "/:id",
  requireTenant,
  authorize("org_owner", "employee"),
  validate(updateMemberSchema),
  updateMember
);

router.patch(
  "/:id/deactivate",
  requireTenant,
  authorize("org_owner"),
  deactivateUser
);

router.patch(
  "/:id/reactivate",
  requireTenant,
  authorize("org_owner"),
  reactivateUser
);

router.delete("/:id", requireTenant, authorize("org_owner"), deleteUser);

export default router;