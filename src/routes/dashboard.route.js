import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import  getScientistDashboard  from "../controllers/scientistDashboard.controller.js";
import RoleMiddleware from "../middlewares/role.middleware.js";
import getAdminDashboard from "../controllers/getAdminDashboard.controller.js";

const router = Router();

router.get("/scientist", authMiddleware,
    RoleMiddleware("SCIENTIST"),
     getScientistDashboard);

     router.get("/admin", authMiddleware, RoleMiddleware(["ADMIN"]), getAdminDashboard);

export default router;