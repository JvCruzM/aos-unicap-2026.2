import { tarefaService } from "../services/index.js";
import { AppError } from "../utils/index.js";

const criarTarefa = async (req, res) => {
  return res.status(201).json(await tarefaService.criarTarefa(req.body));
};

const listarTarefas = async (req, res) => {
  return res.status(200).json(await tarefaService.listarTarefas());
};

const buscarTarefa = async (req, res) => {
  const tarefa = await tarefaService.buscarTarefa(req.params.objectId);
  if (!tarefa) throw new AppError("Tarefa não encontrada.", 404);
  return res.status(200).json(tarefa);
};

const atualizarTarefa = async (req, res) => {
  const tarefa = await tarefaService.atualizarTarefa(req.params.objectId, req.body);
  if (!tarefa) throw new AppError("Tarefa não encontrada.", 404);
  return res.status(200).json(tarefa);
};

const excluirTarefa = async (req, res) => {
  if (!(await tarefaService.excluirTarefa(req.params.objectId))) {
    throw new AppError("Tarefa não encontrada.", 404);
  }
  return res.status(200).json({ message: "Tarefa excluída com sucesso." });
};

export default { criarTarefa, listarTarefas, buscarTarefa, atualizarTarefa, excluirTarefa };
