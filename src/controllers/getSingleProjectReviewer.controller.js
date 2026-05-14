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
      .populate("assignedReviewerId", "name email institution department");

    if (!project) {
      throw new ApiError("Project not found", 404);
    }

    // Check if project is assigned to this reviewer
    if (project.assignedReviewerId?._id.toString() !== reviewerId && 
        project.assignedReviewerId?.toString() !== reviewerId) {
      throw new ApiError("This project is not assigned to you", 403);
    }

    // REMOVED status check - Reviewer can view project regardless of status
    // Only submission will be restricted based on status

    // Check if project is already reviewed
    const existingReview = await Review.findOne({ projectId, reviewerId });
    
    // Determine if reviewer can submit review (only for SUBMITTED or UNDER_REVIEW status)
    const canSubmitReview = project.status === "SUBMITTED" || project.status === "UNDER_REVIEW";
    
    // Determine if review is already submitted
    const isAlreadyReviewed = !!existingReview;

    // Get all reviews for this project (history)
    const allReviews = await Review.find({ projectId })
      .populate("reviewerId", "name email institution")
      .sort({ reviewedAt: -1 });

    // Calculate time taken for each stage
    const calculateDays = (startDate, endDate) => {
      if (!startDate || !endDate) return null;
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };

    const timeStats = {
      submissionToAssignment: calculateDays(project.submittedAt, project.assignedAt),
      assignmentToReview: calculateDays(project.assignedAt, project.underReviewAt),
      reviewToDecision: calculateDays(project.underReviewAt, project.approvedAt || project.rejectedAt),
      totalTime: calculateDays(project.createdAt, project.approvedAt || project.rejectedAt || new Date())
    };

    return res.status(200).json({
      project: {
        // Basic Info
        id: project._id,
        uniqueCode: project.uniqueCode,
        version: project.version,
        proposalType: project.proposalType,
        title: project.title,
        discipline: project.discipline,
        stationOrCollege: project.stationOrCollege,
        year: project.year,
        
        // Content
        introduction: project.introduction,
        actionPlan: project.actionPlan,
        expectedOutcome: project.expectedOutcome,
        objectives: project.objectives,
        
        // Budget
        budget: project.budget,
        scientistInvolve: project.scientistInvolve,
        
        // Status & Flow
        status: project.status,
        similarityScore: project.similarityScore,
        finalComment: project.finalComment,
        
        // Timelines
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        submittedAt: project.submittedAt,
        assignedAt: project.assignedAt,
        underReviewAt: project.underReviewAt,
        approvedAt: project.approvedAt,
        rejectedAt: project.rejectedAt,
        revisionRequestedAt: project.revisionRequestedAt,
        
        // Time statistics
        timeStats: timeStats,
        
        // Submitted By (Scientist)
        submittedBy: {
          id: project.ownerId._id,
          name: project.ownerId.name,
          email: project.ownerId.email,
          institution: project.ownerId.institution,
          department: project.ownerId.department
        },
        
        // Assigned Reviewer
        assignedReviewer: project.assignedReviewerId ? {
          id: project.assignedReviewerId._id,
          name: project.assignedReviewerId.name,
          email: project.assignedReviewerId.email,
          institution: project.assignedReviewerId.institution,
          department: project.assignedReviewerId.department
        } : null
      },
      
      // Review information
      review: existingReview || null,
      alreadyReviewed: isAlreadyReviewed,
      canSubmitReview: canSubmitReview && !isAlreadyReviewed,
      
      // All review history
      reviewHistory: allReviews.map(review => ({
        id: review._id,
        decision: review.decision,
        comment: review.comment,
        score: review.score,
        reviewedBy: {
          id: review.reviewerId._id,
          name: review.reviewerId.name,
          email: review.reviewerId.email,
          institution: review.reviewerId.institution
        },
        reviewedAt: review.reviewedAt
      })),
      
      // Status metadata
      statusInfo: {
        currentStatus: project.status,
        statusDescription: getStatusDescription(project.status),
        canReview: canSubmitReview && !isAlreadyReviewed,
        isPending: project.status === "SUBMITTED" || project.status === "UNDER_REVIEW",
        isCompleted: project.status === "APPROVED" || project.status === "REJECTED",
        isRevisionRequired: project.status === "REVISION_REQUIRED"
      }
    });
    
  } catch (error) {
    next(error);
  }
};

// Helper function to get status description
const getStatusDescription = (status) => {
  const descriptions = {
    DRAFT: "Proposal is being prepared by the scientist",
    SUBMITTED: "Proposal submitted, waiting for reviewer assignment",
    UNDER_REVIEW: "Proposal is currently being reviewed",
    APPROVED: "Proposal has been approved",
    REJECTED: "Proposal has been rejected",
    REVISION_REQUIRED: "Changes requested, waiting for resubmission"
  };
  return descriptions[status] || "Unknown status";
};

export default getProjectForReview;