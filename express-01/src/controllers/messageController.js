import { messageService } from "../services/index.js";

const getMessages = async (req, res) => {
  const messages = await messageService.getAllMessages();
  return res.send(messages);
};

const getMessage = async (req, res) => {
  const message = await messageService.getMessageById(req.params.messageId);
  return res.send(message);
};

const createMessage = async (req, res) => {
  const message = await messageService.createMessage({
    text: req.body.text,
    userId: req.context.me.id,
  });

  return res.send(message);
};

const deleteMessage = async (req, res) => {
  await messageService.deleteMessage(req.params.messageId);
  return res.send(true);
};

export default {
  getMessages,
  getMessage,
  createMessage,
  deleteMessage,
};
