import { userService } from "../services/index.js";

const getUsers = async (req, res) => {
  const users = await userService.getAllUsers();
  return res.send(users);
};

const getUser = async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  return res.send(user);
};

const createUser = (req, res) => {
  return res.send("POST HTTP method on user resource");
};

const updateUser = (req, res) => {
  return res.send(`PUT HTTP method on user/${req.params.userId} resource`);
};

const deleteUser = (req, res) => {
  return res.send(`DELETE HTTP method on user/${req.params.userId} resource`);
};

export default {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
};
