import Project from "../models/project.schema.js";
import ApiError from "../utils/ApiError.js";

export const createProject = async (req, res, next) => {
  try {
    const projectData = {
      ...req.body,
      ownerId: req.user.userId, 
      status: "DRAFT"           
    };

    const savedProject = await Project.create(projectData);

    return res.status(201).json({
      message: "Project created successfully",
      project: {
        id: savedProject._id,
        title: savedProject.title,
        status: savedProject.status,
        ownerId: savedProject.ownerId,
        createdAt: savedProject.createdAt
      }
    });

  } catch (error) {
    next(error); 
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      throw new ApiError("Project not found", 404);
    }

    // Only owner can edit
    if (project.ownerId.toString() !== req.user.userId) {
      throw new ApiError("Unauthorized access", 403);
    }

    // Only draft projects are editable
    if (project.status !== "DRAFT") {
      throw new ApiError(
        "Only draft projects can be edited",
        400
      );
    }

    // SAFE deep merge
    project.set(req.body);

    // Recalculate budget total AFTER merge
    if (project.budget) {
      project.budget.total =
        (project.budget.nonRecurring || 0) +
        (project.budget.recurring || 0) +
        (project.budget.travel || 0) +
        (project.budget.operational || 0) +
        (project.budget.manpower || 0);
    }

    const updatedProject = await project.save();

    return res.status(200).json({
      message: "Project updated successfully",
      project: {
        id: updatedProject._id,
        title: updatedProject.title,
        status: updatedProject.status,
        updatedAt: updatedProject.updatedAt,
      }
    });

  } catch (error) {
    next(error);
  }
};

export const submitProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      throw new ApiError("Project not found", 404);
    }

    // Only owner can submit
    if (project.ownerId.toString() !== req.user.userId) {
      throw new ApiError("Unauthorized access", 403);
    }

    // Only drafts can be submitted
    if (project.status !== "DRAFT") {
      throw new ApiError(
        "Project already submitted",
        400
      );
    }

    // to check whether complete
    if (!project.objectives || project.objectives.length === 0) {
      throw new ApiError(
        "Project is incomplete. At least one objective is required before submission.",
        400
      );
    }

    project.status = "PENDING";

    await project.save();

    return res.status(200).json({
      message: "Project submitted successfully",
      project: {
        id: project._id,
        title: project.title,
        status: project.status,
      }
    });

  } catch (error) {
    next(error);
  }
};