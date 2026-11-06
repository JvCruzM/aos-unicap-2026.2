import { ZodError } from "zod";
import { AppError, env } from "../utils/index.js";

const errorMiddleware = (err, req, res, next) => {
  const isDev = env.NODE_ENV !== "production";

  if (isDev) {
    console.error(err.stack);
  } else {
    console.error(`${err.name || "Error"}: ${err.message}`);
  }

  if (err instanceof SyntaxError && err.type === "entity.parse.failed") {
    const message = "body: JSON malformado";
    return res.status(400).json({
      status: "fail",
      message,
      errors: [message],
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).send({
      status: err.status,
      message: err.message,
      ...(isDev && { stack: err.stack }),
    });
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(409).send({
      status: "fail",
      message: err.errors?.length
        ? err.errors.map((e) => e.message).join(", ")
        : "Registro duplicado.",
      ...(isDev && { stack: err.stack }),
    });
  }

  if (err.name === "SequelizeValidationError") {
    return res.status(400).send({
      status: "fail",
      message: err.errors?.length
        ? err.errors.map((e) => e.message).join(", ")
        : err.message,
      ...(isDev && { stack: err.stack }),
    });
  }

  if (err.name === "SequelizeDatabaseError" && err.original?.code === "22P02") {
    return res.status(400).send({
      status: "fail",
      message: "Identificador (ID) fornecido possui formato inválido.",
      ...(isDev && { stack: err.stack }),
    });
  }

  if (err instanceof ZodError) {
    const errors = err.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    return res.status(400).json({
      status: "fail",
      message: errors.join("; "),
      errors,
    });
  }

  return res.status(500).send({
    status: "error",
    message: isDev ? err.message : "Algo deu errado no servidor.",
    ...(isDev && { stack: err.stack }),
  });
};

export default errorMiddleware;
