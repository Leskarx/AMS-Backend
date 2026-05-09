import { Router } from 'express';
import  loginController  from '../controllers/login.controller.js';
import registerController from '../controllers/register.controller.js';
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";

const router = Router();

router.post('/login',loginController);
router.post('/register',
    authMiddleware,
    roleMiddleware(["ADMIN"]), // Only ADMIN can register new users
    registerController);

export default router;



