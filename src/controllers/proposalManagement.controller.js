import mongoose from "mongoose";
import Project from "../models/project.schema.js";

// Get all projects
export const getAllProjects = async (req, res, next) => {
  try {
    const {
      status,
      discipline,
      proposalType,
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    // Status filter
    if (
      status &&
      [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "REVISION_REQUIRED",
      ].includes(status)
    ) {
      query.status = status;
    }

    // Discipline filter
    if (discipline) {
      query.discipline = discipline;
    }

    // Proposal type filter
    if (proposalType && ["NEW", "SANCTIONED"].includes(proposalType)) {
      query.proposalType = proposalType;
    }

    // Search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { uniqueCode: { $regex: search, $options: "i" } },
        { stationOrCollege: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const total = await Project.countDocuments(query);

    const projects = await Project.find(query)
      .populate("ownerId", "name email")
      .populate("assignedReviewerId", "name email expertise")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    return res.status(200).json({
      projects,

      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },

      filters: {
        status: status || "all",
        discipline: discipline || "all",
        proposalType: proposalType || "all",
        search: search || null,
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get project by ID
export const getProjectById = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        message: "Invalid project ID format",
      });
    }

    const project = await Project.findById(projectId)
      .populate("ownerId", "name email")
      .populate("assignedReviewerId", "name email expertise");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    return res.status(200).json({
      ...project.toObject(),

      trackingDetails: {
        createdAt: project.createdAt,

        updatedAt: project.updatedAt,

        submittedAt: project.submittedAt || null,

        assignedAt: project.assignedAt || null,

        underReviewAt: project.underReviewAt || null,

        revisionRequestedAt: project.revisionRequestedAt || null,

        approvedAt: project.approvedAt || null,

        rejectedAt: project.rejectedAt || null,

        currentStatus: project.status,

        reviewerAssigned: !!project.assignedReviewerId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete project
export const deleteProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        message: "Invalid project ID format",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    await Project.findByIdAndDelete(projectId);

    return res.status(200).json({
      message: "Project deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Project statistics
export const getProjectStatistics = async (req, res, next) => {
  try {
    const [
      totalProjects,
      draftProjects,
      submittedProjects,
      underReviewProjects,
      approvedProjects,
      rejectedProjects,
      revisionRequiredProjects,
      recentProjects,
    ] = await Promise.all([
      Project.countDocuments(),

      Project.countDocuments({
        status: "DRAFT",
      }),

      Project.countDocuments({
        status: "SUBMITTED",
      }),

      Project.countDocuments({
        status: "UNDER_REVIEW",
      }),

      Project.countDocuments({
        status: "APPROVED",
      }),

      Project.countDocuments({
        status: "REJECTED",
      }),

      Project.countDocuments({
        status: "REVISION_REQUIRED",
      }),

      Project.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("ownerId", "name email")
        .select("uniqueCode title status createdAt ownerId"),
    ]);

    return res.status(200).json({
      totalProjects,
      draftProjects,
      submittedProjects,
      underReviewProjects,
      approvedProjects,
      rejectedProjects,
      revisionRequiredProjects,

      recentProjects: recentProjects.map((project) => ({
        id: project._id,
        uniqueCode: project.uniqueCode,
        title: project.title,
        status: project.status,
        createdAt: project.createdAt,
        scientist: project.ownerId,
      })),
    });
  } catch (error) {
    next(error);
  }
};
