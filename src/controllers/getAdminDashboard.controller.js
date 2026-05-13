import Project from "../models/project.schema.js";
import User from "../models/user.schema.js";
import Review from "../models/review.schema.js";

const getAdminDashboard = async (req, res, next) => {
  try {
    // Get all statistics in parallel
    const [
      totalProjects,
      draftProjects,
      submittedProjects,
      underReviewProjects,
      approvedProjects,
      rejectedProjects,
      revisionRequiredProjects,
      totalScientists,
      totalReviewers,
      totalAdmins,
      totalReviews,
      recentProjects,
      recentReviews
    ] = await Promise.all([
      // Project counts
      Project.countDocuments(),
      Project.countDocuments({ status: "DRAFT" }),
      Project.countDocuments({ status: "SUBMITTED" }),
      Project.countDocuments({ status: "UNDER_REVIEW" }),
      Project.countDocuments({ status: "APPROVED" }),
      Project.countDocuments({ status: "REJECTED" }),
      Project.countDocuments({ status: "REVISION_REQUIRED" }),
      
      // User counts by role
      User.countDocuments({ role: "SCIENTIST" }),
      User.countDocuments({ role: "REVIEWER" }),
      User.countDocuments({ role: "ADMIN" }),
      
      // Review count
      Review.countDocuments(),
      
      // 5 most recent projects
      Project.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("ownerId", "name email institution")
        .populate("assignedReviewerId", "name email")
        .select("uniqueCode title status discipline createdAt similarityScore stationOrCollege"),
      
      // 5 most recent reviews
      Review.find()
        .sort({ reviewedAt: -1 })
        .limit(5)
        .populate("projectId", "title uniqueCode")
        .populate("reviewerId", "name email")
    ]);

    // Calculate approval rate
    const totalDecisions = approvedProjects + rejectedProjects;
    const approvalRate = totalDecisions > 0 
      ? Math.round((approvedProjects / totalDecisions) * 100) 
      : 0;

    // Get projects by discipline (for chart data)
    const disciplineStats = await Project.aggregate([
      {
        $group: {
          _id: "$discipline",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Get monthly submission trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await Project.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]);

    // Get unassigned submitted projects (not under review yet)
    const unassignedProjects = await Project.countDocuments({
      status: "SUBMITTED",
      assignedReviewerId: null
    });

    // Get reviewers workload
    const reviewerWorkload = await User.aggregate([
      {
        $match: { role: "REVIEWER", isActive: true }
      },
      {
        $lookup: {
          from: "projects",
          localField: "_id",
          foreignField: "assignedReviewerId",
          as: "assignedProjects"
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          assignedCount: { $size: "$assignedProjects" },
          pendingCount: {
            $size: {
              $filter: {
                input: "$assignedProjects",
                as: "project",
                cond: { $in: ["$$project.status", ["SUBMITTED", "UNDER_REVIEW"]] }
              }
            }
          }
        }
      },
      {
        $sort: { assignedCount: -1 }
      },
      {
        $limit: 5
      }
    ]);

    return res.status(200).json({
      statistics: {
        projects: {
          total: totalProjects,
          draft: draftProjects,
          submitted: submittedProjects,
          underReview: underReviewProjects,
          approved: approvedProjects,
          rejected: rejectedProjects,
          revisionRequired: revisionRequiredProjects,
          unassigned: unassignedProjects
        },
        users: {
          total: totalScientists + totalReviewers + totalAdmins,
          scientists: totalScientists,
          reviewers: totalReviewers,
          admins: totalAdmins
        },
        reviews: {
          total: totalReviews,
          approvalRate: approvalRate
        }
      },
      recentProjects: recentProjects.map(project => ({
        id: project._id,
        uniqueCode: project.uniqueCode,
        title: project.title,
        discipline: project.discipline || "Not specified",
        stationOrCollege: project.stationOrCollege,
        status: project.status,
        similarityScore: project.similarityScore || 0,
        submittedBy: project.ownerId?.name || "Unknown",
        submittedByInstitution: project.ownerId?.institution,
        assignedTo: project.assignedReviewerId?.name || "Not assigned",
        submittedDate: project.createdAt
      })),
      recentReviews: recentReviews.map(review => ({
        id: review._id,
        proposalTitle: review.projectId?.title || "Unknown",
        proposalCode: review.projectId?.uniqueCode,
        decision: review.decision,
        comment: review.comment ? (review.comment.substring(0, 100) + (review.comment.length > 100 ? "..." : "")) : "",
        score: review.score,
        reviewedBy: review.reviewerId?.name || "Unknown",
        reviewedAt: review.reviewedAt
      })),
      charts: {
        topDisciplines: disciplineStats.map(item => ({
          discipline: item._id || "Not specified",
          count: item.count
        })),
        monthlyTrends: monthlyTrends.map(item => ({
          month: `${item._id.year}-${item._id.month}`,
          submissions: item.count
        }))
      },
      reviewerWorkload: reviewerWorkload.map(reviewer => ({
        id: reviewer._id,
        name: reviewer.name,
        email: reviewer.email,
        assignedProjects: reviewer.assignedCount,
        pendingReviews: reviewer.pendingCount
      }))
    });

  } catch (error) {
    next(error);
  }
};

export default getAdminDashboard;