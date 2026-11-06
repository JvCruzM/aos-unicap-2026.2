import jwt from "jsonwebtoken";
import models from "../models/index.js";
import { AppError, env } from "../utils/index.js";

const publicUser = (user) => ({ id: user.id, username: user.username, email: user.email });

const login = async (req, res) => {
  const { login: identifier, username, email, password } = req.body;
  const user = await models.User.findByLogin(identifier ?? username ?? email);
  if (!user || !(await user.validatePassword(password))) {
    throw new AppError("Credenciais inválidas.", 401);
  }
  const data = publicUser(user);
  const token = jwt.sign(data, env.JWT_SECRET, { algorithm: "HS256", expiresIn: "15m" });
  return res.status(200).json({ status: "success", data: { token, user: data } });
};

const getSession = async (req, res) => {
  return res.status(200).json(publicUser(req.context.me));
};

export default {
  login,
  getSession,
};
