import Project from "../models/project.schema.js";
import User from "../models/user.schema.js";
import Review from "../models/review.schema.js";

 const getAdminDashboard = async (req, res, next) => {
  try {
    // Get all statistics in parallel
    const [
      totalProjects,
      draftProjects,
      pendingProjects,
      approvedProjects,
      rejectedProjects,
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
      Project.countDocuments({ status: "PENDING" }),
      Project.countDocuments({ status: "APPROVED" }),
      Project.countDocuments({ status: "REJECTED" }),
      
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
        .populate("ownerId", "name email")
        .populate("assignedReviewerId", "name email")
        .select("title status discipline createdAt similarityScore"),
      
      // 5 most recent reviews
      Review.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("projectId", "title")
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

    // Get unassigned pending projects
    const unassignedProjects = await Project.countDocuments({
      status: "PENDING",
      assignedReviewerId: null
    });

    // Get reviewers workload
    const reviewerWorkload = await User.aggregate([
      {
        $match: { role: "REVIEWER" }
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
                cond: { $eq: ["$$project.status", "PENDING"] }
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
          pending: pendingProjects,
          approved: approvedProjects,
          rejected: rejectedProjects,
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
        title: project.title,
        discipline: project.discipline || "Not specified",
        status: project.status,
        similarityScore: project.similarityScore || 0,
        submittedBy: project.ownerId?.name || "Unknown",
        assignedTo: project.assignedReviewerId?.name || "Not assigned",
        submittedDate: project.createdAt
      })),
      recentReviews: recentReviews.map(review => ({
        id: review._id,
        proposalTitle: review.projectId?.title || "Unknown",
        decision: review.decision,
        comment: review.comment.substring(0, 100) + (review.comment.length > 100 ? "..." : ""),
        reviewedBy: review.reviewerId?.name || "Unknown",
        reviewedAt: review.createdAt
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