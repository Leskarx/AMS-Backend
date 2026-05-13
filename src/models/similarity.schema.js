import mongoose from "mongoose";

const similaritySchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    similarityScore: {
      type: Number,
      default: 0,
    },

    matches: [
      {
        projectId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Project",
        },

        score: Number,

        matchedTextPreview: String,
      },
    ],

    checkedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

similaritySchema.index({ projectId: 1 });

export default mongoose.model("Similarity", similaritySchema);