import { Router } from "express";
import { sessionController } from "../controllers/index.js";

const router = Router();

router.get("/", sessionController.getSession);

export default router;
