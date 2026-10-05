import Sequelize from "sequelize";
import { AppError } from "../utils/index.js";

const errorMiddleware = (err, req, res, next) => {
  let statusCode = 500;
  let status = "error";
  let message = "Algo deu errado no servidor";

  if (err instanceof Sequelize.ValidationError) {
    statusCode = 400;
    status = "fail";

    message = err.errors
      .map((error) => `${error.path}: ${error.message}`)
      .join("; ");
  } else if (err instanceof Sequelize.UniqueConstraintError) {
    statusCode = 409;
    status = "fail";

    message = err.errors
      .map((error) => `${error.path}: registro duplicado`)
      .join("; ");
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    status = err.status;
    message = err.message;
  }

  const response = {
    status,
    message,
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  return res.status(statusCode).send(response);
};

export default errorMiddleware;