import { userService } from "../services/index.js";

const contextMiddleware = async (req, res, next) => {
  req.context = {
    me: await userService.getUserByLogin("rwieruch"),
  };
  next();
};

export default contextMiddleware;
