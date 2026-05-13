import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { submitReviewSchema } from "../validators/review.validator.js";
import submitReviewController from "../controllers/submitReview.controller.js";
import getReviewerDashboard from "../controllers/getReviewerDashboard.controller.js";
import getAssignedProjects from "../controllers/getAssignedProjects.controller.js";
import getProjectForReview from "../controllers/getSingleProjectReviewer.controller.js";
// import {
//   getAssignedProjects,
//   getProjectForReview,
//   submitReview,
//   getProjectReviews,
//   getReviewerDashboard
// } from "../controllers/review.controller.js";
import roleMiddleware from "../middlewares/role.middleware.js";

const router = Router();

// All review routes require authentication and REVIEWER role
router.use(authMiddleware);
router.use(roleMiddleware("REVIEWER"));

// // Dashboard overview
router.get("/dashboard", getReviewerDashboard);

// // Get all assigned projects
router.get("/assigned-projects", getAssignedProjects);



// Get specific project for review
router.get("/project/:projectId", getProjectForReview);



// Submit review (approve/reject)
router.post(
  "/project/:projectId/review",
  submitReviewController
);

// Get review history for a project (accessible to owner, reviewer, admin)
// router.get("/project/:projectId/reviews", getProjectReviews);

export default router;