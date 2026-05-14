import Project from "../models/project.schema.js";
import Similarity from "../models/similarity.schema.js";
import Review from "../models/review.schema.js";
import User from "../models/user.schema.js";

// Get single project for scientist or admin
const getSingleProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Find the project with all populated fields
    const project = await Project.findById(projectId)
      .populate("ownerId", "name email institution department")
      .populate("assignedReviewerId", "name email institution department");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check permission
    const isOwner = project.ownerId._id.toString() === userId;
    const isAdmin = userRole === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        message: "Access denied. You can only view your own projects." 
      });
    }

    // Get similarity results
    const similarity = await Similarity.findOne({ projectId })
      .populate("matches.projectId", "title uniqueCode status discipline year ownerId");

    // Get all reviews for this project
    const reviews = await Review.find({ projectId })
      .populate("reviewerId", "name email institution department")
      .sort({ reviewedAt: -1 });

    // Calculate time statistics
    const calculateDays = (startDate, endDate) => {
      if (!startDate || !endDate) return null;
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };

    const timeStats = {
      createdAt: project.createdAt,
      submittedAt: project.submittedAt,
      assignedAt: project.assignedAt,
      underReviewAt: project.underReviewAt,
      approvedAt: project.approvedAt,
      rejectedAt: project.rejectedAt,
      revisionRequestedAt: project.revisionRequestedAt,
      submissionToAssignment: calculateDays(project.submittedAt, project.assignedAt),
      assignmentToReview: calculateDays(project.assignedAt, project.underReviewAt),
      reviewToDecision: calculateDays(project.underReviewAt, project.approvedAt || project.rejectedAt),
      totalTime: calculateDays(project.createdAt, project.approvedAt || project.rejectedAt || new Date())
    };

    // Get total review count and statistics
    const reviewStats = {
      totalReviews: reviews.length,
      approvedCount: reviews.filter(r => r.decision === "APPROVED").length,
      rejectedCount: reviews.filter(r => r.decision === "REJECTED").length,
      revisionCount: reviews.filter(r => r.decision === "REVISION_REQUIRED").length,
      averageScore: reviews.length > 0 
        ? Math.round(reviews.reduce((sum, r) => sum + (r.score || 0), 0) / reviews.length)
        : null
    };

    // Get all scientists involved (from scientistInvolve array)
    const scientistsInvolved = project.scientistInvolve || [];

    // Prepare response with maximum details
    const responseData = {
      // Basic Information
      id: project._id,
      uniqueCode: project.uniqueCode,
      version: project.version,
      proposalType: project.proposalType,
      stationOrCollege: project.stationOrCollege,
      title: project.title,
      discipline: project.discipline || "Not specified",
      year: project.year,
      status: project.status,
      
      // Content
      introduction: project.introduction,
      actionPlan: project.actionPlan,
      expectedOutcome: project.expectedOutcome,
      objectives: project.objectives,
      
      // Budget Details
      budget: {
        nonRecurring: project.budget?.nonRecurring || 0,
        recurringContingency: project.budget?.recurringContingency || 0,
        travellingAllowances: project.budget?.travellingAllowances || 0,
        operationalExpenses: project.budget?.operationalExpenses || 0,
        manpower: project.budget?.manpower || 0,
        grandTotal: project.budget?.grandTotal || 0
      },
      
      // Scientists Involved
      scientistInvolve: scientistsInvolved.map(s => ({
        scientistName: s.scientistName,
        nonRecurring: s.nonRecurring || 0,
        recurringContingency: s.recurringContingency || 0
      })),
      
      // Similarity
      similarityScore: project.similarityScore || 0,
      
      // Review Information
      finalComment: project.finalComment,
      
      // Timestamps
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      submittedAt: project.submittedAt,
      assignedAt: project.assignedAt,
      underReviewAt: project.underReviewAt,
      approvedAt: project.approvedAt,
      rejectedAt: project.rejectedAt,
      revisionRequestedAt: project.revisionRequestedAt,
      
      // Time Statistics
      timeStats: timeStats,
      
      // Review Statistics
      reviewStats: reviewStats,
      
      // Submitted By (Scientist)
      submittedBy: {
        id: project.ownerId._id,
        name: project.ownerId.name,
        email: project.ownerId.email,
        institution: project.ownerId.institution,
        department: project.ownerId.department
      },
      
      // Assigned Reviewer
      assignedReviewer: project.assignedReviewerId ? {
        id: project.assignedReviewerId._id,
        name: project.assignedReviewerId.name,
        email: project.assignedReviewerId.email,
        institution: project.assignedReviewerId.institution,
        department: project.assignedReviewerId.department
      } : null,
      
      // Status Information
      statusInfo: {
        currentStatus: project.status,
        statusDescription: getStatusDescription(project.status),
        canBeEdited: project.status === "DRAFT" || project.status === "REVISION_REQUIRED",
        canBeResubmitted: project.status === "REVISION_REQUIRED",
        isPending: project.status === "SUBMITTED" || project.status === "UNDER_REVIEW",
        isCompleted: project.status === "APPROVED" || project.status === "REJECTED"
      }
    };

    // Add similarity matches if exists
    if (similarity && similarity.matches && similarity.matches.length > 0) {
      responseData.similarityMatches = similarity.matches.slice(0, 5).map(match => ({
        id: match.projectId?._id,
        title: match.projectId?.title || "Unknown",
        uniqueCode: match.projectId?.uniqueCode,
        discipline: match.projectId?.discipline,
        status: match.projectId?.status,
        year: match.projectId?.year,
        score: match.score,
        similarityLevel: getSimilarityLevel(match.score)
      }));
      
      // Add highest similarity warning
      const highestMatch = similarity.matches[0];
      if (highestMatch && highestMatch.score >= 70) {
        responseData.similarityWarning = {
          level: "HIGH",
          message: "This proposal has high similarity with existing projects. Please review carefully.",
          score: highestMatch.score,
          projectTitle: highestMatch.projectId?.title
        };
      } else if (highestMatch && highestMatch.score >= 40) {
        responseData.similarityWarning = {
          level: "MODERATE",
          message: "This proposal has moderate similarity with existing projects.",
          score: highestMatch.score,
          projectTitle: highestMatch.projectId?.title
        };
      }
    }

    // Add reviews with detailed information
    if (reviews.length > 0) {
      responseData.reviews = reviews.map(review => ({
        id: review._id,
        decision: review.decision,
        comment: review.comment,
        score: review.score,
        reviewedBy: {
          id: review.reviewerId._id,
          name: review.reviewerId.name,
          email: review.reviewerId.email,
          institution: review.reviewerId.institution,
          department: review.reviewerId.department
        },
        reviewedAt: review.reviewedAt,
        reviewedAtFormatted: new Date(review.reviewedAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      }));
      
      // Add latest review
      responseData.latestReview = {
        decision: reviews[0].decision,
        comment: reviews[0].comment,
        score: reviews[0].score,
        reviewedBy: reviews[0].reviewerId.name,
        reviewedAt: reviews[0].reviewedAt
      };
    }

    // Add activity timeline
    responseData.activityTimeline = buildActivityTimeline(project, reviews);

    return res.status(200).json(responseData);

  } catch (error) {
    next(error);
  }
};

// Helper function to get status description
const getStatusDescription = (status) => {
  const descriptions = {
    DRAFT: "Proposal is being prepared and can be edited",
    SUBMITTED: "Proposal submitted and waiting for reviewer assignment",
    UNDER_REVIEW: "Proposal is currently being reviewed by assigned reviewer",
    APPROVED: "Proposal has been approved",
    REJECTED: "Proposal has been rejected",
    REVISION_REQUIRED: "Changes requested by reviewer, waiting for resubmission"
  };
  return descriptions[status] || "Unknown status";
};

// Helper function to get similarity level
const getSimilarityLevel = (score) => {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MODERATE";
  if (score >= 20) return "LOW";
  return "MINIMAL";
};

// Helper function to build activity timeline
const buildActivityTimeline = (project, reviews) => {
  const activities = [];
  
  if (project.createdAt) {
    activities.push({
      type: "CREATED",
      title: "Proposal Created",
      description: `Proposal "${project.title}" was created`,
      timestamp: project.createdAt,
      date: new Date(project.createdAt).toLocaleDateString(),
      icon: "file"
    });
  }
  
  if (project.submittedAt) {
    activities.push({
      type: "SUBMITTED",
      title: "Proposal Submitted",
      description: "Proposal was submitted for review",
      timestamp: project.submittedAt,
      date: new Date(project.submittedAt).toLocaleDateString(),
      icon: "send"
    });
  }
  
  if (project.assignedAt) {
    activities.push({
      type: "ASSIGNED",
      title: "Reviewer Assigned",
      description: `Reviewer ${project.assignedReviewerId?.name || "assigned"} was assigned`,
      timestamp: project.assignedAt,
      date: new Date(project.assignedAt).toLocaleDateString(),
      icon: "user-check"
    });
  }
  
  if (project.underReviewAt) {
    activities.push({
      type: "UNDER_REVIEW",
      title: "Under Review",
      description: "Reviewer started the review process",
      timestamp: project.underReviewAt,
      date: new Date(project.underReviewAt).toLocaleDateString(),
      icon: "eye"
    });
  }
  
  // Add review activities
  reviews.forEach(review => {
    activities.push({
      type: review.decision,
      title: `${review.decision.replaceAll("_", " ")} Review`,
      description: review.comment.substring(0, 100) + (review.comment.length > 100 ? "..." : ""),
      timestamp: review.reviewedAt,
      date: new Date(review.reviewedAt).toLocaleDateString(),
      icon: review.decision === "APPROVED" ? "check" : review.decision === "REJECTED" ? "x" : "refresh",
      reviewer: review.reviewerId?.name
    });
  });
  
  if (project.revisionRequestedAt) {
    activities.push({
      type: "REVISION_REQUESTED",
      title: "Revision Requested",
      description: "Changes requested by reviewer",
      timestamp: project.revisionRequestedAt,
      date: new Date(project.revisionRequestedAt).toLocaleDateString(),
      icon: "edit"
    });
  }
  
  if (project.approvedAt) {
    activities.push({
      type: "APPROVED",
      title: "Proposal Approved",
      description: "Proposal has been approved",
      timestamp: project.approvedAt,
      date: new Date(project.approvedAt).toLocaleDateString(),
      icon: "check-circle"
    });
  }
  
  if (project.rejectedAt) {
    activities.push({
      type: "REJECTED",
      title: "Proposal Rejected",
      description: "Proposal has been rejected",
      timestamp: project.rejectedAt,
      date: new Date(project.rejectedAt).toLocaleDateString(),
      icon: "x-circle"
    });
  }
  
  // Sort by timestamp descending (newest first)
  return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

export default getSingleProject;