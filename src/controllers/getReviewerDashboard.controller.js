// import ApiError from "../utils/ApiError.js";
import Review from "../models/review.schema.js";
import Project from "../models/project.schema.js";
// import User from "../models/user.schema.js";

// Get all reviews for reviewer's dashboard (with statistics)
const getReviewerDashboard = async (req, res, next) => {
  try {
    const reviewerId = req.user.userId;
    
    // Check if user is a reviewer
    // const user = await User.findById(reviewerId);
    // if (!user || user.role !== "REVIEWER") {
    //   throw new ApiError("Access denied. Only reviewers can access this resource", 403);
    // }


    // Get statistics
    const [assignedProjects, reviewsGiven] = await Promise.all([
      Project.find({ 
        assignedReviewerId: reviewerId,
        status: { $ne: "DRAFT" }
      }).countDocuments(),
      Review.find({ reviewerId }).countDocuments()
    ]);

    // Get pending projects
    const pendingProjects = await Project.find({
      assignedReviewerId: reviewerId,
      status: "PENDING"
    })
    .populate("ownerId", "name email")
    .sort({ createdAt: 1 })
    .limit(10);

    // Get recent reviews
    const recentReviews = await Review.find({ reviewerId })
      .populate("projectId", "title")
      .sort({ createdAt: -1 })
      .limit(5);

    // Calculate approval/rejection rate
    const approvedCount = await Review.countDocuments({ 
      reviewerId, 
      decision: "APPROVED" 
    });
    const rejectedCount = await Review.countDocuments({ 
      reviewerId, 
      decision: "REJECTED" 
    });
    
    const totalDecisions = approvedCount + rejectedCount;
    const approvalRate = totalDecisions > 0 
      ? Math.round((approvedCount / totalDecisions) * 100) 
      : 0;

    return res.status(200).json({
      statistics: {
        assignedProjects,
        reviewsGiven,
        pendingReviews: assignedProjects - reviewsGiven,
        approvedCount,
        rejectedCount,
        approvalRate
      },
      pendingProjects,
      recentReviews
    });

  } catch (error) {
    next(error);
  }
};

export default getReviewerDashboard;