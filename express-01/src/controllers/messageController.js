import { messageService } from "../services/index.js";
import { AppError } from "../utils/index.js";

const getMessages = async (req, res) => {
  const messages = await messageService.getAllMessages();

  return res.status(200).send(messages);
};

const getMessage = async (req, res) => {
  const message = await messageService.getMessageById(
    req.params.messageId,
  );

  if (!message) {
    throw new AppError("Mensagem não encontrada", 404);
  }

  return res.status(200).send(message);
};

const createMessage = async (req, res) => {
  if (!req.body?.text || !req.body.text.trim()) {
    throw new AppError(
      "O campo text é obrigatório",
      400,
    );
  }

  const message = await messageService.createMessage({
    text: req.body.text,
    userId: req.context.me.id,
  });

  return res.status(201).send(message);
};

const updateMessage = async (req, res) => {
  if (!req.body?.text || !req.body.text.trim()) {
    throw new AppError(
      "O campo text é obrigatório",
      400,
    );
  }

  const message = await messageService.updateMessage(
    req.params.messageId,
    {
      text: req.body.text,
    },
  );

  if (!message) {
    throw new AppError("Mensagem não encontrada", 404);
  }

  return res.status(200).send(message);
};

const deleteMessage = async (req, res) => {
  const result = await messageService.deleteMessage(
    req.params.messageId,
  );

  if (result === 0) {
    throw new AppError(
      "Mensagem não encontrada",
      404,
    );
  }

  return res.status(204).send();
};

export default {
  getMessages,
  getMessage,
  createMessage,
  updateMessage,
  deleteMessage,
};