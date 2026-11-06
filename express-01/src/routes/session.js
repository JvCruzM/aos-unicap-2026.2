import { Router } from "express";
import { sessionController } from "../controllers/index.js";
import { authLimiterMiddleware, contextMiddleware } from "../middlewares/index.js";

const router = Router();

router.use(authLimiterMiddleware);

router.get("/", contextMiddleware, sessionController.getSession);

export default router;
