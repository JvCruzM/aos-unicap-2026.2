import { Router } from "express";
import { messageController } from "../controllers/index.js";

const router = Router();

router.get("/", messageController.getMessages);
router.get("/:messageId", messageController.getMessage);
router.post("/", messageController.createMessage);
router.put("/:messageId", messageController.updateMessage);
router.delete("/:messageId", messageController.deleteMessage);

export default router;
