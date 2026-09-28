import { userService } from "../services/index.js";

const getSession = async (req, res) => {
  const user = await userService.getUserById(req.context.me.id);
  return res.send(user);
};

export default {
  getSession,
};
