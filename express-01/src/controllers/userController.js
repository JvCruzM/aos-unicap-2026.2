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

const createUser = async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username?.trim() || !email?.trim()) {
      return res.status(400).send({
        error: "Username e email são obrigatórios",
      });
    }

    const user = await userService.createUser({
      username,
      email,
    });

    return res.status(201).send(user);
  } catch (error) {
    console.error(error);

    return res.status(500).send({
      error: "Erro interno do servidor",
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username?.trim() || !email?.trim()) {
      return res.status(400).send({
        error: "Username e email são obrigatórios",
      });
    }

    const user = await userService.updateUser(
      req.params.userId,
      {
        username,
        email,
      },
    );

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

const deleteUser = async (req, res) => {
  try {
    const result = await userService.deleteUser(
      req.params.userId,
    );

    if (result === 0) {
      return res.status(404).send({
        error: "Usuário não encontrado",
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
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
};