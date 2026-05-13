import ApiError from "../utils/ApiError.js";
import Project from "../models/project.schema.js";
import User from "../models/user.schema.js";

const assignReviewer = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { reviewerId } = req.body;
    
    // Find the project
    const project = await Project.findById(projectId);
    if (!project) {
      throw new ApiError("Project not found", 404);
    }
    
    // Check if project is already approved, rejected, or under revision
    if (project.status === "APPROVED" || project.status === "REJECTED") {
      throw new ApiError(`Cannot assign reviewer to a ${project.status.toLowerCase()} project`, 400);
    }
    
    // Find the reviewer
    const reviewer = await User.findById(reviewerId);
    if (!reviewer) {
      throw new ApiError("Reviewer not found", 404);
    }
    
    // Check if user has REVIEWER role
    if (reviewer.role !== "REVIEWER") {
      throw new ApiError("User must have REVIEWER role", 400);
    }
    
    // Assign reviewer to project
    project.assignedReviewerId = reviewerId;
    
    // If project is DRAFT, change to SUBMITTED when assigning reviewer
    if (project.status === "DRAFT") {
      project.status = "SUBMITTED";
    }
    
    await project.save();
    
    // Populate reviewer details for response
    await project.populate("assignedReviewerId", "name email");
    
    return res.status(200).json({
      message: "Reviewer assigned successfully",
      project: {
        id: project._id,
        uniqueCode: project.uniqueCode,
        title: project.title,
        status: project.status,
        assignedReviewer: project.assignedReviewerId
      }
    });
    
  } catch (error) {
    next(error);
  }
};

export default assignReviewer;