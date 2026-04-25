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

router.get("/users", paginationMiddleware.paginate, adminController.getUsers);
router.put("/users/:id/suspend", adminController.suspendUser);
router.put("/users/:id/restore", adminController.restoreUser);
router.patch("/users/:id/role", adminController.updateUserRole);

router.get("/tracks", paginationMiddleware.paginate, adminController.getTracks);
router.patch("/tracks/:id/block", adminController.blockTrack);
router.patch("/tracks/:id/unblock", adminController.unblockTrack);
router.delete("/tracks/:id", adminController.deleteTrack);

router.get("/albums", paginationMiddleware.paginate, adminController.getAlbums);
router.patch("/albums/:id/block", adminController.blockAlbum);
router.patch("/albums/:id/unblock", adminController.unblockAlbum);
router.delete("/albums/:id", adminController.deleteAlbum);

router.get("/analytics", adminController.getAnalytics);

export default router;
