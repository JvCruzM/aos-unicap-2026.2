import { userService } from "../services/index.js";
import { AppError } from "../utils/index.js";

const getSession = async (req, res) => {
  const user = await userService.getUserById(
    req.context.me.id,
  );

  if (!user) {
    throw new AppError("Usuário não encontrado", 404);
  }

  return res.status(200).send(user);
};

export default {
  getSession,
};