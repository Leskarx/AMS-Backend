import { Router } from "express";

import getScientistProposals from "../controllers/getAllProjectScientist.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";
import getSingleProject from "../controllers/getSingleProjectToView.controller.js";

const router = Router();


// Scientist views all their proposals (with query)
router.get("/my-proposals", authMiddleware,
    roleMiddleware("SCIENTIST"),
    getScientistProposals);

    router.get("/project/:projectId", authMiddleware, getSingleProject);

    export default router;