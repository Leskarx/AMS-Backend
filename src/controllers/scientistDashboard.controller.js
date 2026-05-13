import Project from "../models/project.schema.js";
import Review from "../models/review.schema.js";

const getScientistDashboard = async (req, res, next) => {
  try {
    const scientistId = req.user.userId;

    // Get all proposals count by status - updated status values
    const [totalProposals, submittedProposals, underReviewProposals, approvedProposals, rejectedProposals, revisionRequiredProposals] = await Promise.all([
      Project.countDocuments({ ownerId: scientistId }),
      Project.countDocuments({ ownerId: scientistId, status: "SUBMITTED" }),
      Project.countDocuments({ ownerId: scientistId, status: "UNDER_REVIEW" }),
      Project.countDocuments({ ownerId: scientistId, status: "APPROVED" }),
      Project.countDocuments({ ownerId: scientistId, status: "REJECTED" }),
      Project.countDocuments({ ownerId: scientistId, status: "REVISION_REQUIRED" })
    ]);

    // Get 5 most recent proposals - added uniqueCode
    const recentProposals = await Project.find({ ownerId: scientistId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("uniqueCode title status createdAt similarityScore discipline stationOrCollege");

    // Get recent reviews/comments on scientist's proposals
    const recentReviews = await Review.find()
      .populate({
        path: "projectId",
        match: { ownerId: scientistId },
        select: "title discipline uniqueCode"
      })
      .populate("reviewerId", "name email institution")
      .sort({ reviewedAt: -1 })
      .limit(5);

    // Filter out null projects (where project doesn't belong to this scientist)
    const filteredReviews = recentReviews.filter(review => review.projectId !== null);

    return res.status(200).json({
      statistics: {
        total: totalProposals,
        submitted: submittedProposals,
        underReview: underReviewProposals,
        approved: approvedProposals,
        rejected: rejectedProposals,
        revisionRequired: revisionRequiredProposals
      },
      recentProposals: recentProposals.map(proposal => ({
        id: proposal._id,
        uniqueCode: proposal.uniqueCode,
        title: proposal.title,
        discipline: proposal.discipline || "Not specified",
        stationOrCollege: proposal.stationOrCollege,
        status: proposal.status,
        similarityScore: proposal.similarityScore || 0,
        submittedDate: proposal.createdAt
      })),
      recentReviews: filteredReviews.map(review => ({
        id: review._id,
        proposalTitle: review.projectId.title,
        proposalCode: review.projectId.uniqueCode,
        decision: review.decision,
        discipline: review.projectId.discipline || "Not specified",
        comment: review.comment,
        score: review.score,
        reviewedBy: review.reviewerId.name,
        reviewedByInstitution: review.reviewerId.institution,
        reviewedAt: review.reviewedAt
      }))
    });

  } catch (error) {
    next(error);
  }
};

export default getScientistDashboard;