import jwt from "jsonwebtoken";
import { z } from "zod";
import models from "../models/index.js";
import { AppError, env } from "../utils/index.js";

export const authMiddleware = async (req, res, next) => {
  const match = req.get("Authorization")?.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    throw new AppError("Token de autenticação não fornecido.", 401);
  }

  let payload;
  try {
    payload = jwt.verify(match[1], env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError("Token de autenticação inválido ou expirado.", 401);
    }
    throw error;
  }
  if (!z.string().uuid({ version: "v4" }).safeParse(payload?.id).success) {
    throw new AppError("Token de autenticação inválido.", 401);
  }
  const user = await models.User.findByPk(payload.id);
  if (!user) {
    throw new AppError("Usuário não autenticado.", 401);
  }
  req.context = { ...req.context, me: user };
  next();
};

export default authMiddleware;
