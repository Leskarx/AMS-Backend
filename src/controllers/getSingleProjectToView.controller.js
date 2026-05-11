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
      .populate("ownerId", "name email")
      .populate("assignedReviewerId", "name email");

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
      .populate("matches.projectId", "title");

    // Get reviews for this project
    const reviews = await Review.find({ projectId })
      .populate("reviewerId", "name email")
      .sort({ createdAt: -1 });

    // Prepare response
    const responseData = {
      id: project._id,
      title: project.title,
      discipline: project.discipline || "Not specified",
      year: project.year,
      status: project.status,
      introduction: project.introduction,
      actionPlan: project.actionPlan,
      expectedOutcome: project.expectedOutcome,
      objectives: project.objectives,
      budget: project.budget,
      similarityScore: project.similarityScore || 0,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      submittedBy: {
        id: project.ownerId._id,
        name: project.ownerId.name,
        email: project.ownerId.email
      },
      assignedReviewer: project.assignedReviewerId ? {
        id: project.assignedReviewerId._id,
        name: project.assignedReviewerId.name,
        email: project.assignedReviewerId.email
      } : null
    };

    // Add similarity matches if exists
    if (similarity && similarity.matches.length > 0) {
      responseData.similarityMatches = similarity.matches.slice(0, 3).map(match => ({
        title: match.projectId?.title || "Unknown",
        score: match.score
      }));
    }

    // Add reviews if exists
    if (reviews.length > 0) {
      responseData.reviews = reviews.map(review => ({
        id: review._id,
        decision: review.decision,
        comment: review.comment,
        reviewedBy: review.reviewerId.name,
        reviewedAt: review.createdAt
      }));
    }

    return res.status(200).json(responseData);

  } catch (error) {
    next(error);
  }
};

export default getSingleProject;