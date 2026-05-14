import mongoose from "mongoose";
import User from "../models/user.schema.js";
import Project from "../models/project.schema.js";

// Get all users with pagination and filters
export const getAllUsers = async (req, res, next) => {
  try {
    const {
      role,
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};

    // Filter by role
    if (role && ["SCIENTIST", "REVIEWER", "ADMIN"].includes(role)) {
      query.role = role;
    }

    // Filter by active status (optional)
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === "true";
    }

    // Search by name, email, institution, department, or expertise
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { institution: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { expertise: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get total count for pagination
    const total = await User.countDocuments(query);

    // Get users with pagination
    const users = await User.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select("-password"); // Exclude password field

    // Get project count for each scientist/reviewer
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        let projectStats = {};

        if (user.role === "SCIENTIST") {
          const [
            total,
            draft,
            submitted,
            underReview,
            approved,
            rejected,
            revisionRequired,
          ] = await Promise.all([
            Project.countDocuments({ ownerId: user._id }),
            Project.countDocuments({ ownerId: user._id, status: "DRAFT" }),
            Project.countDocuments({ ownerId: user._id, status: "SUBMITTED" }),
            Project.countDocuments({
              ownerId: user._id,
              status: "UNDER_REVIEW",
            }),
            Project.countDocuments({ ownerId: user._id, status: "APPROVED" }),
            Project.countDocuments({ ownerId: user._id, status: "REJECTED" }),
            Project.countDocuments({
              ownerId: user._id,
              status: "REVISION_REQUIRED",
            }),
          ]);

          projectStats = {
            totalProjects: total,
            draftProjects: draft,
            submittedProjects: submitted,
            underReviewProjects: underReview,
            approvedProjects: approved,
            rejectedProjects: rejected,
            revisionRequiredProjects: revisionRequired,
          };
        }

        if (user.role === "REVIEWER") {
          const assignedProjects = await Project.countDocuments({
            assignedReviewerId: user._id,
          });

          const completedReviews = await Project.countDocuments({
            assignedReviewerId: user._id,
            status: { $in: ["APPROVED", "REJECTED"] },
          });

          const pendingReviews = await Project.countDocuments({
            assignedReviewerId: user._id,
            status: "UNDER_REVIEW",
          });

          projectStats = {
            assignedProjects,
            completedReviews,
            pendingReviews,
          };
        }

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          institution: user.institution || "Not specified",
          department: user.department || "Not specified",
          expertise: user.expertise || [],
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          ...projectStats,
        };
      }),
    );

    return res.status(200).json({
      users: usersWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
      filters: {
        role: role || "all",
        search: search || null,
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single user by ID
export const getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Validate ObjectId format first
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user's projects (if scientist)
    let projects = [];
    if (user.role === "SCIENTIST") {
      projects = await Project.find({ ownerId: user._id })
        .select(
          "uniqueCode title status createdAt similarityScore version stationOrCollege",
        )
        .sort({ createdAt: -1 });
    }

    // Get assigned projects (if reviewer)
    let assignedProjects = [];
    if (user.role === "REVIEWER") {
      assignedProjects = await Project.find({ assignedReviewerId: user._id })
        .select("uniqueCode title status ownerId createdAt")
        .populate("ownerId", "name email");
    }

    return res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      institution: user.institution || "Not specified",
      department: user.department || "Not specified",
      expertise: user.expertise || [],
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      projects: user.role === "SCIENTIST" ? projects : undefined,
      assignedProjects: user.role === "REVIEWER" ? assignedProjects : undefined,
    });
  } catch (error) {
    next(error);
  }
};

// Update user role (admin only)
export const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role, expertise } = req.body;

    if (!role || !["SCIENTIST", "REVIEWER", "ADMIN"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (role === "REVIEWER" && !expertise) {
      return res.status(400).json({
        message: "Expertise is required for reviewer role",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent changing own role
    if (userId === req.user.userId) {
      return res
        .status(400)
        .json({ message: "You cannot change your own role" });
    }

    // If changing from REVIEWER to something else, clear expertise
    if (user.role === "REVIEWER" && role !== "REVIEWER") {
      user.expertise = [];
    }

    user.role = role;

    if (role === "REVIEWER") {
      user.expertise = expertise;
    }
    await user.save();

    return res.status(200).json({
      message: "User role updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        institution: user.institution,
        department: user.department,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update user status (activate/deactivate)
export const updateUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be a boolean" });
    }

    // Prevent deactivating own account
    if (userId === req.user.userId && isActive === false) {
      return res
        .status(400)
        .json({ message: "You cannot deactivate your own account" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isActive = isActive;
    await user.save();

    return res.status(200).json({
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete user (admin only)
export const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Prevent deleting own account
    if (userId === req.user.userId) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own account" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has projects (if scientist)
    if (user.role === "SCIENTIST") {
      const projectCount = await Project.countDocuments({ ownerId: userId });
      if (projectCount > 0) {
        return res.status(400).json({
          message: `Cannot delete user. They have ${projectCount} projects. Reassign or delete projects first.`,
        });
      }
    }

    // Check if user is assigned as reviewer
    if (user.role === "REVIEWER") {
      const assignedProjects = await Project.countDocuments({
        assignedReviewerId: userId,
      });
      if (assignedProjects > 0) {
        return res.status(400).json({
          message: `Cannot delete user. They are assigned to ${assignedProjects} projects. Reassign reviewers first.`,
        });
      }
    }

    await User.findByIdAndDelete(userId);

    return res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get user statistics for admin dashboard
export const getUserStatistics = async (req, res, next) => {
  try {
    const [
      totalScientists,
      totalReviewers,
      totalAdmins,
      activeUsers,
      inactiveUsers,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments({ role: "SCIENTIST" }),
      User.countDocuments({ role: "REVIEWER" }),
      User.countDocuments({ role: "ADMIN" }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "name email role institution department expertise createdAt isActive",
        ),
    ]);

    return res.status(200).json({
      totalUsers: totalScientists + totalReviewers + totalAdmins,
      scientists: totalScientists,
      reviewers: totalReviewers,
      admins: totalAdmins,
      activeUsers,
      inactiveUsers,
      recentUsers: recentUsers.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        institution: user.institution || "Not specified",
        department: user.department || "Not specified",
        expertise: user.expertise || [],
        isActive: user.isActive,
        joinedAt: user.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};
