import { Router } from "express";
import { userController } from "../controllers/index.js";
import { validate } from "../middlewares/index.js";
import {
  createUserSchema,
  userIdParamSchema,
} from "../middlewares/validationSchemas.js";

const router = Router();

router.get("/", userController.getUsers);
router.get("/:userId", validate(userIdParamSchema), userController.getUser);
router.post("/", validate(createUserSchema), userController.createUser);
router.put("/:userId", validate(userIdParamSchema), userController.updateUser);
router.delete("/:userId", validate(userIdParamSchema), userController.deleteUser);

export default router;
