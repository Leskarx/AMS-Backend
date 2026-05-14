import { Router } from 'express';
import loginController from '../controllers/login.controller.js';
import registerController from '../controllers/register.controller.js';
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";
import resetPasswordController from "../controllers/resetPassword.controller.js";
import publicRegisterController from "../controllers/publicRegister.controller.js";

const router = Router();

router.post('/login', loginController);

router.post(
  '/register',
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  registerController
);

router.post(
  "/public-register",
  publicRegisterController
);

router.post(
  "/reset-password",
  authMiddleware,
  resetPasswordController
);

export default router;