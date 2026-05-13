import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["SCIENTIST", "REVIEWER", "ADMIN"],
      required: true,
    },

    institution: String,

    department: String,

    expertise: [String],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });

userSchema.index({ role: 1 });

export default mongoose.model("User", userSchema);