import mongoose from "mongoose";
import Project from "../models/project.schema.js";

// Get all projects with pagination and filters
export const getAllProjects = async (req, res, next) => {
  try {

    const {
      status,
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    // Build query
    const query = {};

    // Filter by status
    if (
      status &&
      ["DRAFT", "PENDING", "APPROVED", "REJECTED"].includes(status)
    ) {
      query.status = status;
    }

    // Search by project title
    if (search) {
      query.title = {
        $regex: search.trim().replace(/\s+/g, " "),
        $options: "i"
      };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Total count
    const total = await Project.countDocuments(query);

    // Get projects
    const projects = await Project.find(query)
      .populate("ownerId", "name email")
      .populate("assignedReviewerId", "name email")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    return res.status(200).json({
      projects,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      filters: {
        status: status || "all",
        search: search || null,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get single project by ID
export const getProjectById = async (req, res, next) => {
  try {

    const { projectId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        message: "Invalid project ID format"
      });
    }

    // Find project
    const project = await Project.findById(projectId)
      .populate("ownerId", "name email")
      .populate("assignedReviewerId", "name email");

    if (!project) {
      return res.status(404).json({
        message: "Project not found"
      });
    }

    return res.status(200).json(project);

  } catch (error) {
    next(error);
  }
};

// Delete project
export const deleteProject = async (req, res, next) => {
  try {

    const { projectId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        message: "Invalid project ID format"
      });
    }

    // Find project
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found"
      });
    }

    // Delete project
    await Project.findByIdAndDelete(projectId);

    return res.status(200).json({
      message: "Project deleted successfully"
    });

  } catch (error) {
    next(error);
  }
};

// Get project statistics
export const getProjectStatistics = async (req, res, next) => {
  try {

    const [
      totalProjects,
      pendingProjects,
      approvedProjects,
      rejectedProjects,
      draftProjects,
      recentProjects
    ] = await Promise.all([

      Project.countDocuments(),

      Project.countDocuments({
        status: "PENDING"
      }),

      Project.countDocuments({
        status: "APPROVED"
      }),

      Project.countDocuments({
        status: "REJECTED"
      }),

      Project.countDocuments({
        status: "DRAFT"
      }),

      Project.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("ownerId", "name email")
        .select("title status createdAt ownerId")
    ]);

    return res.status(200).json({

      totalProjects,
      pendingProjects,
      approvedProjects,
      rejectedProjects,
      draftProjects,

      recentProjects: recentProjects.map(project => ({
        id: project._id,
        title: project.title,
        status: project.status,
        createdAt: project.createdAt,
        scientist: project.ownerId
      }))

    });

  } catch (error) {
    next(error);
  }
};