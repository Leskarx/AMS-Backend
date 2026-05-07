import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    discipline: {
      type: String,
    },
    year: {
      type: Number,
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    introduction: String,
    actionPlan: String,
    expectedOutcome: String,

    objectives: [String],

    budget: {
      nonRecurring: Number,
      recurring: Number,
      travel: Number,
      operational: Number,
      manpower: Number,
      total: Number,
    },

    status: {
      type: String,
      enum: ["DRAFT", "PENDING", "APPROVED", "REJECTED"],
      default: "DRAFT",
    },

    similarityScore: {
      type: Number,
      default: 0,
    },

    assignedReviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);


projectSchema.index({ ownerId: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ title: "text", introduction: "text" });

export default mongoose.model("Project", projectSchema);