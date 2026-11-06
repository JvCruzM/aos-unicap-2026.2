import jwt from "jsonwebtoken";
import { randomBytes, randomUUID } from "node:crypto";
import models, { sequelize } from "../models/index.js";
import { AppError, env } from "../utils/index.js";

const publicUser = (user) => ({ id: user.id, username: user.username, email: user.email });

const issueTokens = async (user, transaction) => {
  const data = publicUser(user);
  const token = jwt.sign(data, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "15m",
    jwtid: randomUUID(),
  });
  const refreshToken = randomBytes(40).toString("hex");
  await models.RefreshToken.create({
    token: refreshToken,
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }, { transaction, logging: false });
  return { token, refreshToken, user: data };
};

const login = async (req, res) => {
  const { login: identifier, username, email, password } = req.body;
  const user = await models.User.findByLogin(identifier ?? username ?? email);
  if (!user || !(await user.validatePassword(password))) {
    throw new AppError("Credenciais inválidas.", 401);
  }
  const data = await issueTokens(user);
  return res.status(200).json({ status: "success", data });
};

const refresh = async (req, res) => {
  const data = await sequelize.transaction(async (transaction) => {
    const storedToken = await models.RefreshToken.findOne({
      where: { token: req.body.refreshToken },
      include: [{ model: models.User, required: true }],
      transaction,
      logging: false,
      // Só uma requisição por vez pode consumir este refresh token.
      lock: { level: transaction.LOCK.UPDATE, of: models.RefreshToken },
    });
    if (!storedToken || storedToken.expiresAt <= new Date()) {
      throw new AppError("Refresh token inválido ou expirado.", 401);
    }
    await storedToken.destroy({ transaction, logging: false });
    return await issueTokens(storedToken.user, transaction);
  });
  return res.status(200).json({ status: "success", data });
};

const logout = async (req, res) => {
  await models.RefreshToken.destroy({
    where: { token: req.body.refreshToken }, logging: false,
  });
  return res.status(204).end();
};

const getSession = async (req, res) => {
  return res.status(200).json(publicUser(req.context.me));
};

export default {
  login,
  getSession,
  refresh,
  logout,
};
