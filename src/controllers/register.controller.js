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

    // Remove password from frontend input
    const { name, email, role, expertise } = parsed.data;

    // Default password
    const defaultPassword = "default1234";

    // Check existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new ApiError("User already exists with this email", 409);
    }

    // Hash default password
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,

      expertise: role === "REVIEWER" ? expertise : undefined,
    });

    return res.status(201).json({
      message: "User registered successfully",
      defaultPassword: defaultPassword,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

export default registerController;
