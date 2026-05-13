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

    // Updated status values to match new schema
    if (status && ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "REVISION_REQUIRED"].includes(status)) {
      query.status = status;
    }

    // Search by project title or uniqueCode
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { uniqueCode: { $regex: search, $options: "i" } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate("ownerId", "name email institution department")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select("uniqueCode title discipline status similarityScore createdAt stationOrCollege"),
      Project.countDocuments(query),
    ]);

    return res.status(200).json({
      projects: projects.map(project => ({
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