import Project from "../models/project.schema.js";
import Review from "../models/review.schema.js";
import User from "../models/user.schema.js";
import ApiError from "../utils/ApiError.js";

// Get a single project details for review
const getProjectForReview = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const reviewerId = req.user.userId;
    
    // Check if user is a reviewer
    const user = await User.findById(reviewerId);
    if (!user || user.role !== "REVIEWER") {
      throw new ApiError("Access denied. Only reviewers can access this resource", 403);
    }
    
    const project = await Project.findById(projectId)
      .populate("ownerId", "name email institution department")
      .populate("assignedReviewerId", "name email");

    if (!project) {
      throw new ApiError("Project not found", 404);
    }

    // Check if project is assigned to this reviewer
    if (project.assignedReviewerId?._id.toString() !== reviewerId && 
        project.assignedReviewerId?.toString() !== reviewerId) {
      throw new ApiError("This project is not assigned to you", 403);
    }

    // Check if project status is SUBMITTED or UNDER_REVIEW (updated from PENDING)
    if (project.status !== "SUBMITTED" && project.status !== "UNDER_REVIEW") {
      throw new ApiError(`This project cannot be reviewed. Current status: ${project.status}`, 400);
    }

    // Check if project is already reviewed
    const existingReview = await Review.findOne({ projectId, reviewerId });
    if (existingReview) {
      return res.status(200).json({
        project: {
          id: project._id,
          uniqueCode: project.uniqueCode,
          title: project.title,
          discipline: project.discipline,
          stationOrCollege: project.stationOrCollege,
          introduction: project.introduction,
          actionPlan: project.actionPlan,
          expectedOutcome: project.expectedOutcome,
          objectives: project.objectives,
          budget: project.budget,
          scientistInvolve: project.scientistInvolve,
          status: project.status,
          submittedBy: {
            id: project.ownerId._id,
            name: project.ownerId.name,
            email: project.ownerId.email,
            institution: project.ownerId.institution,
            department: project.ownerId.department
          }
        },
        review: existingReview,
        alreadyReviewed: true
      });
    }

    return res.status(200).json({
      project: {
        id: project._id,
        uniqueCode: project.uniqueCode,
        title: project.title,
        discipline: project.discipline,
        stationOrCollege: project.stationOrCollege,
        introduction: project.introduction,
        actionPlan: project.actionPlan,
        expectedOutcome: project.expectedOutcome,
        objectives: project.objectives,
        budget: project.budget,
        scientistInvolve: project.scientistInvolve,
        status: project.status,
        submittedBy: {
          id: project.ownerId._id,
          name: project.ownerId.name,
          email: project.ownerId.email,
          institution: project.ownerId.institution,
          department: project.ownerId.department
        }
      },
      alreadyReviewed: false
    });
    
  } catch (error) {
    next(error);
  }
};

export default getProjectForReview;