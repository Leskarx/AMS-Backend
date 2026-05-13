import Project from "../models/project.schema.js";
import ApiError from "../utils/ApiError.js";
import { runSimilarityCheckInBackground } from "../services/similarity.worker.js";

export const createProject = async (req, res, next) => {
  try {
    const projectData = {
      ...req.body,
      ownerId: req.user.userId, 
      status: "DRAFT",
      // Generate unique code if not provided
      uniqueCode: req.body.uniqueCode || `PROJ-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    };

    // Save project to database
    const savedProject = await Project.create(projectData);

    // Run similarity check in background without awaiting
    runSimilarityCheckInBackground(savedProject._id, projectData);

    return res.status(201).json({
      message: "Project created successfully",
      project: {
        id: savedProject._id,
        uniqueCode: savedProject.uniqueCode,
        title: savedProject.title,
        status: savedProject.status,
        ownerId: savedProject.ownerId,
        createdAt: savedProject.createdAt
      },
      similarityStatus: "processing"
    });

  } catch (error) {
    next(error); 
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);

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

    // Recalculate budget grand total AFTER merge (using new schema field names)
    if (project.budget) {
      project.budget.grandTotal =
        (project.budget.nonRecurring || 0) +
        (project.budget.recurringContingency || 0) +
        (project.budget.travellingAllowances || 0) +
        (project.budget.operationalExpenses || 0) +
        (project.budget.manpower || 0);
    }

    const updatedProject = await project.save();

    return res.status(200).json({
      message: "Project updated successfully",
      project: {
        projectId: updatedProject._id,
        uniqueCode: updatedProject.uniqueCode,
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

    // Check if project is complete (using new schema fields)
    if (!project.title || !project.introduction || !project.actionPlan || !project.expectedOutcome) {
      throw new ApiError(
        "Project is incomplete. Please fill all required fields before submission.",
        400
      );
    }

    if (!project.objectives || project.objectives.length === 0) {
      throw new ApiError(
        "Project is incomplete. At least one objective is required before submission.",
        400
      );
    }

    if (!project.stationOrCollege) {
      throw new ApiError(
        "Project is incomplete. Station/College is required before submission.",
        400
      );
    }

    if (!project.discipline) {
      throw new ApiError(
        "Project is incomplete. Discipline is required before submission.",
        400
      );
    }

    project.status = "SUBMITTED";

    await project.save();

    return res.status(200).json({
      message: "Project submitted successfully",
      project: {
        id: project._id,
        uniqueCode: project.uniqueCode,
        title: project.title,
        status: project.status,
      }
    });

  } catch (error) {
    next(error);
  }
};






// // Get all projects for scientist (with new schema)
// export const getScientistProposals = async (req, res, next) => {
//   try {
//     const scientistId = req.user.userId;
//     const { status, page = 1, limit = 10 } = req.query;
    
//     const query = { ownerId: scientistId };
    
//     if (status && ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "REVISION_REQUIRED"].includes(status)) {
//       query.status = status;
//     }
    
//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const total = await Project.countDocuments(query);
    
//     const projects = await Project.find(query)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(parseInt(limit))
//       .select("uniqueCode title discipline status similarityScore createdAt version");
    
//     return res.status(200).json({
//       proposals: projects.map(project => ({
//         id: project._id,
//         uniqueCode: project.uniqueCode,
//         title: project.title,
//         discipline: project.discipline,
//         status: project.status,
//         similarityScore: project.similarityScore || 0,
//         version: project.version,
//         createdAt: project.createdAt
//       })),
//       pagination: {
//         currentPage: parseInt(page),
//         totalPages: Math.ceil(total / parseInt(limit)),
//         totalItems: total,
//         itemsPerPage: parseInt(limit)
//       }
//     });
    
//   } catch (error) {
//     next(error);
//   }
// };

// // Get single project by ID
// export const getProjectById = async (req, res, next) => {
//   try {
//     const { projectId } = req.params;
//     const userId = req.user.userId;
//     const userRole = req.user.role;

//     const project = await Project.findById(projectId)
//       .populate("ownerId", "name email institution department")
//       .populate("assignedReviewerId", "name email institution");

//     if (!project) {
//       throw new ApiError("Project not found", 404);
//     }

//     // Check permission
//     const isOwner = project.ownerId._id.toString() === userId;
//     const isAdmin = userRole === "ADMIN";
//     const isReviewer = project.assignedReviewerId?._id.toString() === userId;

//     if (!isOwner && !isAdmin && !isReviewer) {
//       throw new ApiError("Access denied", 403);
//     }

//     // Get reviews if any
//     const reviews = await Review.find({ projectId: project._id })
//       .populate("reviewerId", "name email")
//       .sort({ createdAt: -1 });

//     return res.status(200).json({
//       id: project._id,
//       uniqueCode: project.uniqueCode,
//       version: project.version,
//       proposalType: project.proposalType,
//       stationOrCollege: project.stationOrCollege,
//       title: project.title,
//       discipline: project.discipline,
//       year: project.year,
//       status: project.status,
//       introduction: project.introduction,
//       actionPlan: project.actionPlan,
//       expectedOutcome: project.expectedOutcome,
//       objectives: project.objectives,
//       budget: project.budget,
//       scientistInvolve: project.scientistInvolve,
//       similarityScore: project.similarityScore,
//       finalComment: project.finalComment,
//       createdAt: project.createdAt,
//       updatedAt: project.updatedAt,
//       approvedAt: project.approvedAt,
//       rejectedAt: project.rejectedAt,
//       submittedBy: {
//         id: project.ownerId._id,
//         name: project.ownerId.name,
//         email: project.ownerId.email,
//         institution: project.ownerId.institution,
//         department: project.ownerId.department
//       },
//       assignedReviewer: project.assignedReviewerId ? {
//         id: project.assignedReviewerId._id,
//         name: project.assignedReviewerId.name,
//         email: project.assignedReviewerId.email
//       } : null,
//       reviews: reviews.map(review => ({
//         id: review._id,
//         decision: review.decision,
//         comment: review.comment,
//         score: review.score,
//         reviewedBy: review.reviewerId.name,
//         reviewedAt: review.reviewedAt
//       }))
//     });

//   } catch (error) {
//     next(error);
//   }
// };