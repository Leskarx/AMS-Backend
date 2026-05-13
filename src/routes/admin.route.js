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

import { getUnassignedProposals,
          getReviewersWithWorkload
} from "../controllers/reviewerProposalManagement.controller.js";

const router = Router();

// All user management routes require admin access
router.use(authMiddleware);
router.use(roleMiddleware(["ADMIN"]));

// IMPORTANT: Put specific routes BEFORE parameter routes
router.get("/users/statistics", getUserStatistics);
router.get("/users", getAllUsers);  // This should be before /:userId

// Parameter routes (these go AFTER specific routes)
router.get("/id/:userId", getUserById);
router.patch("/id/:userId/role", updateUserRole);
router.delete("/id/:userId", deleteUser);

router.get(
    "/unassigned-proposals", 
    getUnassignedProposals
  );

  router.get(
    "/reviewers", 
    getReviewersWithWorkload
  );

  // proposal management

export default router;