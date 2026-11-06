import { Router } from "express";
import { userController } from "../controllers/index.js";
import { authMiddleware, validate } from "../middlewares/index.js";
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
} from "../middlewares/validationSchemas.js";

const router = Router();

router.get("/", userController.getUsers);
router.get("/:userId", validate(userIdParamSchema), userController.getUser);
router.post("/", validate(createUserSchema), userController.createUser);
router.put("/:userId", validate(userIdParamSchema), authMiddleware, validate(updateUserSchema), userController.updateUser);
router.delete("/:userId", validate(userIdParamSchema), authMiddleware, userController.deleteUser);

export default router;
