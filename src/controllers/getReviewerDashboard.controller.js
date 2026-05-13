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

    // Get statistics - updated status values
    const [assignedProjects, reviewsGiven] = await Promise.all([
      Project.find({ 
        assignedReviewerId: reviewerId,
        status: { $ne: "DRAFT" }
      }).countDocuments(),
      Review.find({ reviewerId }).countDocuments()
    ]);

    // Get pending projects for review - ONLY UNDER_REVIEW status
    // A reviewer should only see projects that are actively assigned to them for review
    const pendingProjects = await Project.find({
      assignedReviewerId: reviewerId,
      status: "UNDER_REVIEW"  // Changed from $in to just "UNDER_REVIEW"
    })
    .populate("ownerId", "name email institution department")
    .sort({ createdAt: 1 })
    .limit(10)
    .select("uniqueCode title discipline status similarityScore createdAt stationOrCollege");

    // Get recent reviews (already reviewed projects)
    const recentReviews = await Review.find({ reviewerId })
      .populate("projectId", "title uniqueCode")
      .sort({ reviewedAt: -1 })
      .limit(5);

    // Calculate approval/rejection/revision rates
    const approvedCount = await Review.countDocuments({ 
      reviewerId, 
      decision: "APPROVED" 
    });
    const rejectedCount = await Review.countDocuments({ 
      reviewerId, 
      decision: "REJECTED" 
    });
    const revisionCount = await Review.countDocuments({
      reviewerId,
      decision: "REVISION_REQUIRED"
    });
    
    const totalDecisions = approvedCount + rejectedCount + revisionCount;
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
        revisionCount,
        approvalRate
      },
      pendingProjects: pendingProjects.map(project => ({
        id: project._id,
        uniqueCode: project.uniqueCode,
        title: project.title,
        discipline: project.discipline,
        stationOrCollege: project.stationOrCollege,
        status: project.status,
        similarityScore: project.similarityScore,
        submittedBy: {
          name: project.ownerId.name,
          email: project.ownerId.email,
          institution: project.ownerId.institution,
          department: project.ownerId.department
        },
        createdAt: project.createdAt
      })),
      recentReviews: recentReviews.map(review => ({
        id: review._id,
        projectTitle: review.projectId?.title,
        projectCode: review.projectId?.uniqueCode,
        decision: review.decision,
        comment: review.comment?.substring(0, 100),
        reviewedAt: review.reviewedAt
      }))
    });

  } catch (error) {
    next(error);
  }
};

export default getReviewerDashboard;