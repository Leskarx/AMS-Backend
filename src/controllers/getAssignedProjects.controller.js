import Project from "../models/project.schema.js";

// Get all projects assigned for review
const getAssignedProjects = async (req, res, next) => {
  try {
    const reviewerId = req.user.userId;

    const { status, search, page = 1, limit = 10 } = req.query;

    const query = {
      assignedReviewerId: reviewerId,
      status: { $ne: "DRAFT" }, // Exclude drafts
    };

    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      query.status = status;
    }

    // Search by project title
    if (search) {
      query.title = {
        $regex: search,
        $options: "i",
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate("ownerId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Project.countDocuments(query),
    ]);

    return res.status(200).json({
      projects,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export default getAssignedProjects;
