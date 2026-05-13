import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    decision: {
      type: String,
      enum: [
        "APPROVED",
        "REJECTED",
        "REVISION_REQUIRED",
      ],
      required: true,
    },

    comment: {
      type: String,
      required: true,
      trim: true,
    },

    score: {
      type: Number,
      min: 1,
      max: 10,
    },

    reviewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

reviewSchema.index({
  projectId: 1,
  reviewerId: 1,
});

export default mongoose.model("Review", reviewSchema);