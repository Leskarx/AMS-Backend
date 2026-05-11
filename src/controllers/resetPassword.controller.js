import bcrypt from "bcryptjs";
import User from "../models/user.schema.js";
import ApiError from "../utils/ApiError.js";

async function resetPasswordController(req, res, next) {
  try {

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ApiError("All fields are required", 400);
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      throw new ApiError("Current password is incorrect", 401);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({
      message: "Password updated successfully"
    });

  } catch (error) {
    next(error);
  }
}

export default resetPasswordController;