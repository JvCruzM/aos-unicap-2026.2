import { messageService } from "../services/index.js";

const getMessages = async (req, res) => {
  try {
    const messages = await messageService.getAllMessages();

    return res.status(200).send(messages);
  } catch (error) {
    console.error(error);

    return res.status(500).send({
      error: "Erro interno do servidor",
    });
  }
};

const getMessage = async (req, res) => {
  try {
    const message = await messageService.getMessageById(
      req.params.messageId,
    );

    if (!message) {
      return res.status(404).send({
        error: "Mensagem não encontrada",
      });
    }

    return res.status(200).send(message);
  } catch (error) {
    console.error(error);

    return res.status(500).send({
      error: "Erro interno do servidor",
    });
  }
};

const createMessage = async (req, res) => {
  try {
    if (!req.body?.text || !req.body.text.trim()) {
      return res.status(400).send({
        error: "O campo text é obrigatório",
      });
    }

    const message = await messageService.createMessage({
      text: req.body.text,
      userId: req.context.me.id,
    });

    return res.status(201).send(message);
  } catch (error) {
    console.error(error);

    return res.status(500).send({
      error: "Erro interno do servidor",
    });
  }
};

const updateMessage = async (req, res) => {
  try {
    if (!req.body?.text || !req.body.text.trim()) {
      return res.status(400).send({
        error: "O campo text é obrigatório",
      });
    }

    const message = await messageService.updateMessage(
      req.params.messageId,
      {
        text: req.body.text,
      },
    );

    if (!message) {
      return res.status(404).send({
        error: "Mensagem não encontrada",
      });
    }

    return res.status(200).send(message);
  } catch (error) {
    console.error(error);

    return res.status(500).send({
      error: "Erro interno do servidor",
    });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const result = await messageService.deleteMessage(
      req.params.messageId,
    );

    if (result === 0) {
      return res.status(404).send({
        error: "Mensagem não encontrada",
      });
    }

    return res.status(204).send();
  } catch (error) {
    console.error(error);

    return res.status(500).send({
      error: "Erro interno do servidor",
    });
  }
};

export default {
  getMessages,
  getMessage,
  createMessage,
  updateMessage,
  deleteMessage,
};