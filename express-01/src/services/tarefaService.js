import models from "../models/index.js";

const criarTarefa = async ({ descricao, concluida }) => {
  return await models.Tarefa.create({ descricao, concluida });
};

const listarTarefas = async () => {
  return await models.Tarefa.findAll({ order: [["createdAt", "ASC"], ["objectId", "ASC"]] });
};

const buscarTarefa = async (objectId) => {
  return await models.Tarefa.findByPk(objectId);
};

const atualizarTarefa = async (objectId, { descricao, concluida }) => {
  const tarefa = await buscarTarefa(objectId);
  if (!tarefa) return null;
  return await tarefa.update({
    ...(descricao !== undefined && { descricao }),
    ...(concluida !== undefined && { concluida }),
  });
};

const excluirTarefa = async (objectId) => {
  return (await models.Tarefa.destroy({ where: { objectId } })) > 0;
};

export default { criarTarefa, listarTarefas, buscarTarefa, atualizarTarefa, excluirTarefa };
