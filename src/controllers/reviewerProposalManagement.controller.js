import Project from "../models/project.schema.js";
import User from "../models/user.schema.js";

// Get unassigned proposals (submitted projects with no reviewer)
export const getUnassignedProposals = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      search = "",
      discipline,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    // Build query - updated to look for SUBMITTED status (not DRAFT)
    const query = {
      status: "SUBMITTED",
      assignedReviewerId: null
    };

    // Search by title or uniqueCode
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { uniqueCode: { $regex: search, $options: "i" } }
      ];
    }

    // Filter by discipline
    if (discipline) {
      query.discipline = { $regex: discipline, $options: "i" };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get total count for pagination
    const total = await Project.countDocuments(query);
    
    // Get proposals with pagination - added uniqueCode and stationOrCollege
    const proposals = await Project.find(query)
      .populate("ownerId", "name email institution department")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select("uniqueCode title discipline introduction status createdAt similarityScore stationOrCollege year");

    return res.status(200).json({
      proposals: proposals.map(proposal => ({
        id: proposal._id,
        uniqueCode: proposal.uniqueCode,
        title: proposal.title,
        discipline: proposal.discipline || "Not specified",
        stationOrCollege: proposal.stationOrCollege,
        year: proposal.year,
        introduction: proposal.introduction?.substring(0, 200) || "",
        similarityScore: proposal.similarityScore || 0,
        submittedBy: {
          id: proposal.ownerId._id,
          name: proposal.ownerId.name,
          email: proposal.ownerId.email,
          institution: proposal.ownerId.institution,
          department: proposal.ownerId.department
        },
        submittedAt: proposal.createdAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      filters: {
        search: search || null,
        discipline: discipline || null,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get reviewers with workload using aggregation (more efficient)
export const getReviewersWithWorkload = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      search = "",
      sortBy = "currentWorkload",
      sortOrder = "asc"
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build match condition for search - added institution
    const matchCondition = { role: "REVIEWER", isActive: true };
    if (search) {
      matchCondition.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { institution: { $regex: search, $options: "i" } }
      ];
    }

    // Aggregation pipeline - updated status values
    const pipeline = [
      { $match: matchCondition },
      {
        $lookup: {
          from: "projects",
          let: { reviewerId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$assignedReviewerId", "$$reviewerId"] }
              }
            },
            {
              $group: {
                _id: null,
                submitted: {
                  $sum: { $cond: [{ $eq: ["$status", "SUBMITTED"] }, 1, 0] }
                },
                underReview: {
                  $sum: { $cond: [{ $eq: ["$status", "UNDER_REVIEW"] }, 1, 0] }
                },
                approved: {
                  $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, 1, 0] }
                },
                rejected: {
                  $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] }
                },
                revisionRequired: {
                  $sum: { $cond: [{ $eq: ["$status", "REVISION_REQUIRED"] }, 1, 0] }
                },
                total: { $sum: 1 },
                projects: {
                  $push: {
                    id: "$_id",
                    uniqueCode: "$uniqueCode",
                    title: "$title",
                    status: "$status"
                  }
                }
              }
            }
          ],
          as: "workload"
        }
      },
      {
        $addFields: {
          currentWorkload: {
            $add: [
              { $ifNull: [{ $arrayElemAt: ["$workload.submitted", 0] }, 0] },
              { $ifNull: [{ $arrayElemAt: ["$workload.underReview", 0] }, 0] }
            ]
          },
          completedReviews: {
            $add: [
              { $ifNull: [{ $arrayElemAt: ["$workload.approved", 0] }, 0] },
              { $ifNull: [{ $arrayElemAt: ["$workload.rejected", 0] }, 0] }
            ]
          },
          revisionRequiredCount: { $ifNull: [{ $arrayElemAt: ["$workload.revisionRequired", 0] }, 0] },
          totalAssigned: { $ifNull: [{ $arrayElemAt: ["$workload.total", 0] }, 0] },
          assignedProjects: { $ifNull: [{ $arrayElemAt: ["$workload.projects", 0] }, []] }
        }
      },
      {
        $project: {
          password: 0,
          workload: 0
        }
      },
      {
        $sort: { [sortBy]: sortOrder === "asc" ? 1 : -1 }
      },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: parseInt(limit) }]
        }
      }
    ];

    const result = await User.aggregate(pipeline);
    const total = result[0]?.metadata[0]?.total || 0;
    const reviewers = result[0]?.data || [];

    return res.status(200).json({
      reviewers: reviewers.map(reviewer => ({
        id: reviewer._id,
        name: reviewer.name,
        email: reviewer.email,
        role: reviewer.role,
        institution: reviewer.institution,
        department: reviewer.department,
        expertise: reviewer.expertise,
        isActive: reviewer.isActive,
        currentWorkload: reviewer.currentWorkload,
        completedReviews: reviewer.completedReviews,
        revisionRequiredCount: reviewer.revisionRequiredCount,
        totalAssigned: reviewer.totalAssigned,
        assignedProjects: reviewer.assignedProjects.slice(0, 5).map(project => ({
          id: project.id,
          uniqueCode: project.uniqueCode,
          title: project.title,
          status: project.status
        })),
        joinedAt: reviewer.createdAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      filters: {
        search: search || null,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    next(error);
  }
};