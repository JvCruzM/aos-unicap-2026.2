import { z } from "zod";

const requiredString = () =>
  z.string({
    error: (issue) =>
      issue.input === undefined ? "Campo obrigatório" : "Deve ser uma string",
  });

const idParam = () =>
  requiredString().uuid({ version: "v4", error: "Deve ser um UUID v4 válido" });

const passwordSchema = requiredString().min(7, "Deve ter no mínimo 7 caracteres").max(42, "Deve ter no máximo 42 caracteres");

export const createUserSchema = z.object({
  body: z.object({
    username: requiredString().trim().min(1, "Não pode ser vazio"),
    email: requiredString().trim().email("Formato de e-mail inválido"),
    password: passwordSchema,
  }),
});

export const updateUserSchema = z.object({ body: createUserSchema.shape.body.partial() });

export const loginSchema = z.object({
  body: z.object({
    login: requiredString().trim().min(1).optional(),
    username: requiredString().trim().min(1).optional(),
    email: requiredString().trim().email("Formato de e-mail inválido").optional(),
    password: requiredString().min(1),
  }).refine((data) => data.login || data.username || data.email, {
    path: ["login"], message: "Informe login, username ou email",
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({ userId: idParam() }),
});

export const createMessageSchema = z.object({
  body: z.object({
    text: requiredString()
      .trim()
      .min(1, "Não pode ser vazio")
      .max(1000, "Deve ter no máximo 1000 caracteres"),
  }),
});

export const messageIdParamSchema = z.object({
  params: z.object({ messageId: idParam() }),
});
