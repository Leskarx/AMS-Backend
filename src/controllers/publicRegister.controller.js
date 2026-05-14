import ApiError from "../utils/ApiError.js";
import bcrypt from "bcryptjs";
import User from "../models/user.schema.js";

async function publicRegisterController(
  req,
  res,
  next
) {
  try {

    const {
      name,
      email,
      password,
      institution,
      department,
    } = req.body;

    if (
      !name ||
      !email ||
      !password
    ) {
      throw new ApiError(
        "All fields are required",
        400
      );
    }

    const existingUser =
      await User.findOne({ email });

    if (existingUser) {
      throw new ApiError(
        "User already exists",
        409
      );
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,

      // IMPORTANT
      role: "SCIENTIST",

      institution,
      department,

      isActive: true,
    });

    return res.status(201).json({
      message:
        "Registration successful",

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

export default publicRegisterController;