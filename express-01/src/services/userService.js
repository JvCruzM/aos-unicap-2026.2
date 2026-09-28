import models from "../models/index.js";

const getAllUsers = async () => {
  return await models.User.findAll();
};

const getUserById = async (id) => {
  return await models.User.findByPk(id);
};

const getUserByLogin = async (login) => {
  return await models.User.findByLogin(login);
};

const createUser = async ({ username, email }) => {
  return await models.User.create({
    username,
    email,
  });
};

const updateUser = async (id, { username, email }) => {
  const user = await models.User.findByPk(id);

  if (!user) {
    return null;
  }

  return await user.update({
    username,
    email,
  });
};

const deleteUser = async (id) => {
  return await models.User.destroy({
    where: { id },
  });
};

export default {
  getAllUsers,
  getUserById,
  getUserByLogin,
  createUser,
  updateUser,
  deleteUser,
};