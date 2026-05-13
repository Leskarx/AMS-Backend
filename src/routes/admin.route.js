import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";
import {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getUserStatistics
} from "../controllers/userManagement.controller.js";
import {
  getAllProjects,
  getProjectById,
  deleteProject,
  getProjectStatistics
} from "../controllers/proposalManagement.controller.js";

const router = Router();

// All user management routes require admin access
router.use(authMiddleware);
router.use(roleMiddleware(["ADMIN"]));

// IMPORTANT: Put specific routes BEFORE parameter routes
router.get("/users/statistics", getUserStatistics);
router.get("/users", getAllUsers);  // This should be before /:userId

/* =========================
   PROPOSAL MANAGEMENT ROUTES
========================= */

router.get("/projects/statistics", getProjectStatistics);

router.get("/projects", getAllProjects);

router.get("/projects/:projectId", getProjectById);

router.delete("/projects/:projectId", deleteProject);

// Parameter routes (these go AFTER specific routes)
router.get("/:userId", getUserById);
router.patch("/:userId/role", updateUserRole);
router.delete("/:userId", deleteUser);

export default router;