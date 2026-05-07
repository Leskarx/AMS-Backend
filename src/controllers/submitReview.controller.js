import ApiError from "../utils/ApiError.js";
import Review from "../models/review.schema.js";
import Project from "../models/project.schema.js";
import User from "../models/user.schema.js";
import mongoose from "mongoose";

 const submitReview = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { projectId } = req.params;
    const { decision, comment } = req.body;
    const reviewerId = req.user.userId;

    // Validate input
    if (!decision || !["APPROVED", "REJECTED"].includes(decision)) {
      throw new ApiError("Invalid decision. Must be APPROVED or REJECTED", 400);
    }

    if (!comment || comment.trim().length < 10) {
      throw new ApiError("Comment is required and must be at least 10 characters", 400);
    }

    // Check if user is a reviewer
    const user = await User.findById(reviewerId).session(session);
    if (!user || user.role !== "REVIEWER") {
      throw new ApiError("Access denied. Only reviewers can submit reviews", 403);
    }

    // Find the project
    const project = await Project.findById(projectId).session(session);
    if (!project) {
      throw new ApiError("Project not found", 404);
    }

    // Check if project is assigned to this reviewer
    if (project.assignedReviewerId?.toString() !== reviewerId) {
      throw new ApiError("This project is not assigned to you", 403);
    }

    // Check if project status is PENDING
    if (project.status !== "PENDING") {
      throw new ApiError(`Cannot review project with status: ${project.status}`, 400);
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ projectId, reviewerId }).session(session);
    if (existingReview) {
      throw new ApiError("You have already reviewed this project", 400);
    }

    // Create review
    const review = await Review.create([{
      projectId,
      reviewerId,
      decision,
      comment: comment.trim()
    }], { session });

    // Update project status
    project.status = decision;
    await project.save({ session });

    await session.commitTransaction();

    return res.status(201).json({
      message: `Project ${decision.toLowerCase()} successfully`,
      review: review[0],
      projectStatus: project.status
    });

  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};


export default submitReview;