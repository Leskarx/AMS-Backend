import mongoose from "mongoose";

const scientistSchema = new mongoose.Schema(
  {
    scientistName: {
      type: String,
      required: true,
      trim: true,
    },

    nonRecurring: {
      type: Number,
      default: 0,
      min: 0,
    },

    recurringContingency: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    // =================================
    // BASIC DETAILS
    // =================================

    uniqueCode: {
      type: String,
      unique: true,
      required: true,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },

    proposalType: {
      type: String,
      enum: ["NEW", "SANCTIONED"],
      default: "NEW",
    },

    stationOrCollege: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    discipline: {
      type: String,
      enum: [
        "COMPUTER_SCIENCE",
        "AGRICULTURE",
        "BIOTECHNOLOGY",
        "MECHANICAL",
        "CIVIL",
        "Soil Science",
        "Crop Science",
        "Forestry",
        "Food Technology"
      ],
      required: true,
    },

    year: {
      type: Number,
      required: true,
    },

    // =================================
    // OWNER
    // =================================

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // =================================
    // PROJECT CONTENT
    // =================================

    introduction: {
      type: String,
      required: true,
    },

    actionPlan: {
      type: String,
      required: true,
    },

    expectedOutcome: {
      type: String,
      required: true,
    },

    objectives: [
      {
        type: String,
        trim: true,
      },
    ],

    // =================================
    // BUDGET
    // =================================

    budget: {
      nonRecurring: {
        type: Number,
        default: 0,
        min: 0,
      },

      recurringContingency: {
        type: Number,
        default: 0,
        min: 0,
      },

      travellingAllowances: {
        type: Number,
        default: 0,
        min: 0,
      },

      operationalExpenses: {
        type: Number,
        default: 0,
        min: 0,
      },

      manpower: {
        type: Number,
        default: 0,
        min: 0,
      },

      grandTotal: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // =================================
    // SCIENTIST INVOLVEMENT
    // =================================

    scientistInvolve: [scientistSchema],

    // =================================
    // REVIEW FLOW
    // =================================

    status: {
      type: String,
      enum: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "REVISION_REQUIRED",
      ],
      default: "DRAFT",
    },

    assignedReviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    finalComment: {
      type: String,
      trim: true,
    },

    approvedAt: Date,

    rejectedAt: Date,

    // =================================
    // SIMILARITY
    // =================================

    similarityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

// =================================
// AUTO CALCULATE GRAND TOTAL
// =================================

projectSchema.pre("save", function () {
  this.budget.grandTotal =
    (this.budget.nonRecurring || 0) +
    (this.budget.recurringContingency || 0) +
    (this.budget.travellingAllowances || 0) +
    (this.budget.operationalExpenses || 0) +
    (this.budget.manpower || 0);
});

// =================================
// INDEXES
// =================================

projectSchema.index({ ownerId: 1 });

projectSchema.index({ status: 1 });

projectSchema.index({
  assignedReviewerId: 1,
  status: 1,
});

projectSchema.index({
  title: "text",
  introduction: "text",
  expectedOutcome: "text",
});

export default mongoose.model("Project", projectSchema);