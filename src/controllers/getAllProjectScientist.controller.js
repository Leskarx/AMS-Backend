import Project from "../models/project.schema.js";

const getScientistProposals = async (req, res, next) => {
  try {
    const scientistId = req.user.userId;
    const { status, search, page = 1, limit = 10 } = req.query;

    // Build query
    const query = { ownerId: scientistId };

    // Filter by status if provided
    if (
      status &&
      ["DRAFT", "PENDING", "APPROVED", "REJECTED"].includes(status)
    ) {
      query.status = status;
    }

    // Search by title or discipline
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { discipline: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count for pagination
    const total = await Project.countDocuments(query);

    // Get proposals with pagination
    const proposals = await Project.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("title discipline status createdAt similarityScore updatedAt");

    return res.status(200).json({
      proposals: proposals.map((proposal) => ({
        id: proposal._id,
        title: proposal.title,
        discipline: proposal.discipline || "Not specified",
        status: proposal.status,
        similarityScore: proposal.similarityScore || 0,
        createdAt: proposal.createdAt,
        updatedAt: proposal.updatedAt,
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

export default getScientistProposals;
