import { Router } from "express";
import { 
  getProfile, 
  updateProfile, 
  listOrgUsers, 
  inviteUser, 
  deactivateUser, 
  reactivateUser,
  deleteUser,
  listCustomers
} from "./user.controller";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import { updateProfileSchema, inviteUserSchema } from "./user.validation";
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
  (req, res, next) =>
    req.body.role === 'employee' ? employeeSeatLimit(req, res, next) : next(),
  inviteUser
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