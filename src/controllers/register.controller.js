import ApiError from "../utils/ApiError.js";
import bcrypt from "bcryptjs";
import { registerSchema } from "../validators/auth.validator.js";
import User from "../models/user.schema.js";

async function registerController(req, res, next) {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(parsed.error.issues[0].message, 400);
    }

    // Destructure with defaults
    const { name, email, role, expertise, institution, department } =
      parsed.data;

    // Default password
    const defaultPassword = "default1234";

    // Check existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new ApiError("User already exists with this email", 409);
    }

    // Hash default password
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Build user data object
    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
      isActive: true, // Default to active
      mustResetPassword: true,
    };

    // Add role-specific fields
    if (role === "REVIEWER") {
      if (!expertise || expertise.length === 0) {
        throw new ApiError("Expertise is required for reviewers", 400);
      }
      userData.expertise = expertise;
    }

    // Add optional fields if provided
    if (institution) userData.institution = institution;
    if (department) userData.department = department;

    // Create user
    const user = await User.create(userData);

    return res.status(201).json({
      message: "User registered successfully",
      defaultPassword: defaultPassword,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        institution: user.institution,
        department: user.department,
        ...(user.role === "REVIEWER" && { expertise: user.expertise }),
      },
    });
  } catch (error) {
    next(error);
  }
}

export default registerController;
