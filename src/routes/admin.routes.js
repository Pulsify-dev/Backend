import { Router } from "express";
import adminController from "../controllers/admin.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import paginationMiddleware from "../middleware/pagination.middleware.js";

const router = Router();

router.use(authMiddleware.requireAuth);
router.use(authMiddleware.requireAdmin);

router.get(
  "/reports",
  paginationMiddleware.paginate,
  adminController.getReports,
);
router.patch("/reports/:id/resolve", adminController.resolveReport);

router.put("/users/:id/suspend", adminController.suspendUser);
router.put("/users/:id/restore", adminController.restoreUser);

export default router;
