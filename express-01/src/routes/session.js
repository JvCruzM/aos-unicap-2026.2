import { Router } from "express";
import { sessionController } from "../controllers/index.js";
import { authLimiterMiddleware, authMiddleware, validate } from "../middlewares/index.js";
import { loginSchema } from "../middlewares/validationSchemas.js";

const router = Router();

router.post("/", authLimiterMiddleware, validate(loginSchema), sessionController.login);
router.get("/", authMiddleware, sessionController.getSession);

export default router;
