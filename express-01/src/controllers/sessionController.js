import { userService } from "../services/index.js";

const getSession = async (req, res) => {
  try {
    const user = await userService.getUserById(req.context.me.id);

    if (!user) {
      return res.status(404).send({
        error: "Usuário não encontrado",
      });
    }

    return res.status(200).send(user);
  } catch (error) {
    console.error(error);

    return res.status(500).send({
      error: "Erro interno do servidor",
    });
  }
};

export default {
  getSession,
};