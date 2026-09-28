import models from "../models/index.js";

const getAllMessages = async () => {
  return await models.Message.findAll();
};

const getMessageById = async (id) => {
  return await models.Message.findByPk(id);
};

const createMessage = async ({ text, userId }) => {
  return await models.Message.create({
    text,
    userId,
  });
};

const deleteMessage = async (id) => {
  return await models.Message.destroy({
    where: { id },
  });
};

export default {
  getAllMessages,
  getMessageById,
  createMessage,
  deleteMessage,
};
