import { userService } from "../services/index.js";

const getUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();

    return res.status(200).send(users);
  } catch (error) {
    console.error(error);

    return res.status(500).send({
      error: "Erro interno do servidor",
    });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.userId);

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

const createUser = (req, res) => {
  return res.status(200).send(
    "POST HTTP method on user resource",
  );
};

const updateUser = (req, res) => {
  return res.status(200).send(
    `PUT HTTP method on user/${req.params.userId} resource`,
  );
};

const deleteUser = (req, res) => {
  return res.status(200).send(
    `DELETE HTTP method on user/${req.params.userId} resource`,
  );
};

export default {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
};