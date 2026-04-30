import mongoose from "mongoose";

const similaritySchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    similarityScore: Number,

    matches: [
      {
        projectId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Project",
        },
        score: Number,
      },
    ],
  },
  { timestamps: true }
);

similaritySchema.index({ projectId: 1 });

export default mongoose.model("Similarity", similaritySchema);