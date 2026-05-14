import Project from "../models/project.schema.js";

// Get all projects assigned for review
const getAssignedProjects = async (req, res, next) => {
  try {
    const reviewerId = req.user.userId;

    const { 
      status, 
      search, 
      page = 1, 
      limit = 10,
      discipline,
      minSimilarity,
      maxSimilarity,
      fromDate,
      toDate,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    const query = {
      assignedReviewerId: reviewerId,
      status: { $ne: "DRAFT" }, // Exclude drafts
    };

    // Filter by status
    if (status && ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "REVISION_REQUIRED"].includes(status)) {
      query.status = status;
    }

    // Filter by discipline
    if (discipline) {
      query.discipline = discipline;
    }

    // Filter by similarity score range
    if (minSimilarity || maxSimilarity) {
      query.similarityScore = {};
      if (minSimilarity) query.similarityScore.$gte = parseFloat(minSimilarity);
      if (maxSimilarity) query.similarityScore.$lte = parseFloat(maxSimilarity);
    }

    // Filter by date range
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    // Search by project title, uniqueCode, or discipline
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { uniqueCode: { $regex: search, $options: "i" } },
        { discipline: { $regex: search, $options: "i" } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate("ownerId", "name email institution department")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select("uniqueCode title discipline status similarityScore createdAt stationOrCollege year"),
      Project.countDocuments(query),
    ]);

    // Get filter options for dropdowns
    const disciplines = await Project.distinct("discipline");
    const statuses = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "REVISION_REQUIRED"];

    return res.status(200).json({
      projects: projects.map(project => ({
        id: project._id,
        uniqueCode: project.uniqueCode,
        title: project.title,
        discipline: project.discipline,
        stationOrCollege: project.stationOrCollege,
        year: project.year,
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
      filters: {
        status: status || "all",
        discipline: discipline || "all",
        search: search || null,
        minSimilarity: minSimilarity || null,
        maxSimilarity: maxSimilarity || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
        sortBy,
        sortOrder
      },
      filterOptions: {
        disciplines: disciplines.filter(d => d),
        statuses
      }
    });
  } catch (error) {
    next(error);
  }
};

export default getAssignedProjects;