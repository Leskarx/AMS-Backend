import Project from "../models/project.schema.js";
import Similarity from "../models/similarity.schema.js";
import Review from "../models/review.schema.js";

// Get single project for scientist or admin
const getSingleProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Find the project
    const project = await Project.findById(projectId)
      .populate("ownerId", "name email institution department")
      .populate("assignedReviewerId", "name email institution");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check permission
    const isOwner = project.ownerId._id.toString() === userId;
    const isAdmin = userRole === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        message: "Access denied. You can only view your own projects." 
      });
    }

    // Get similarity results
    const similarity = await Similarity.findOne({ projectId })
      .populate("matches.projectId", "title uniqueCode");

    // Get reviews for this project
    const reviews = await Review.find({ projectId })
      .populate("reviewerId", "name email institution")
      .sort({ reviewedAt: -1 });

    // Prepare response
    const responseData = {
      id: project._id,
      uniqueCode: project.uniqueCode,
      version: project.version,
      proposalType: project.proposalType,
      stationOrCollege: project.stationOrCollege,
      title: project.title,
      discipline: project.discipline || "Not specified",
      year: project.year,
      status: project.status,
      introduction: project.introduction,
      actionPlan: project.actionPlan,
      expectedOutcome: project.expectedOutcome,
      objectives: project.objectives,
      budget: project.budget,
      scientistInvolve: project.scientistInvolve,
      similarityScore: project.similarityScore || 0,
      finalComment: project.finalComment,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      approvedAt: project.approvedAt,
      rejectedAt: project.rejectedAt,
      submittedBy: {
        id: project.ownerId._id,
        name: project.ownerId.name,
        email: project.ownerId.email,
        institution: project.ownerId.institution,
        department: project.ownerId.department
      },
      assignedReviewer: project.assignedReviewerId ? {
        id: project.assignedReviewerId._id,
        name: project.assignedReviewerId.name,
        email: project.assignedReviewerId.email,
        institution: project.assignedReviewerId.institution
      } : null
    };

    // Add similarity matches if exists
    if (similarity && similarity.matches && similarity.matches.length > 0) {
      responseData.similarityMatches = similarity.matches.slice(0, 3).map(match => ({
        id: match.projectId?._id,
        title: match.projectId?.title || "Unknown",
        uniqueCode: match.projectId?.uniqueCode,
        score: match.score
      }));
    }

    // Add reviews if exists
    if (reviews.length > 0) {
      responseData.reviews = reviews.map(review => ({
        id: review._id,
        decision: review.decision,
        comment: review.comment,
        score: review.score,
        reviewedBy: {
          name: review.reviewerId.name,
          email: review.reviewerId.email,
          institution: review.reviewerId.institution
        },
        reviewedAt: review.reviewedAt
      }));
    }

    return res.status(200).json(responseData);

  } catch (error) {
    next(error);
  }
};

export default getSingleProject;