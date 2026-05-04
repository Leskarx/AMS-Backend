import ApiError from "../utils/ApiError.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { loginSchema } from "../validators/auth.validator.js";
import User from "../models/user.schema.js"; 

async function loginUser(req, res, next) {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }

    // Validate request body
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.issues[0].message, 400);
    }

    const { email, password } = parsed.data;

    // Find user by email using Mongoose
    const savedUser = await User.findOne({ email });
    
    if (!savedUser) {
      throw new ApiError("Invalid credentials", 401);
    }

    // Compare password
    const validPassword = await bcrypt.compare(password, savedUser.password);
    if (!validPassword) {
      throw new ApiError("Invalid credentials", 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: savedUser._id,  // Mongoose uses _id instead of id
        email: savedUser.email,
        role: savedUser.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Return success response
    return res.status(200).json({
      message: "login success",
      user: {
        id: savedUser._id,      // Mongoose uses _id
        email: savedUser.email,
        name: savedUser.name,   // Include name from your schema
        role: savedUser.role    // Include role for frontend authorization
      },
      token: token
    });

  } catch (error) {
    next(error);
  }
}

export default loginUser;