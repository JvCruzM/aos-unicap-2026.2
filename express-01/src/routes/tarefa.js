import { Router } from "express";
import { tarefaController } from "../controllers/index.js";
import { validate } from "../middlewares/index.js";
import {
  createTarefaSchema,
  updateTarefaSchema,
  tarefaIdParamSchema,
} from "../middlewares/validationSchemas.js";

const router = Router();

router.post("/", validate(createTarefaSchema), tarefaController.criarTarefa);
router.get("/", tarefaController.listarTarefas);
router.get("/:objectId", validate(tarefaIdParamSchema), tarefaController.buscarTarefa);
router.put("/:objectId", validate(tarefaIdParamSchema), validate(updateTarefaSchema), tarefaController.atualizarTarefa);
router.delete("/:objectId", validate(tarefaIdParamSchema), tarefaController.excluirTarefa);

export default router;
