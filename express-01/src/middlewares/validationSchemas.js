import { z } from "zod";

const requiredString = () =>
  z.string({
    error: (issue) =>
      issue.input === undefined ? "Campo obrigatório" : "Deve ser uma string",
  });

const uuidV4 = () =>
  requiredString().uuid({
    version: "v4",
    error: "Deve ser um UUID v4 válido",
  });

export const createUserSchema = z.object({
  body: z.object({
    username: requiredString().trim().min(1, "Não pode ser vazio"),
    email: requiredString().trim().email("Formato de e-mail inválido"),
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({ userId: uuidV4() }),
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
  params: z.object({ messageId: uuidV4() }),
});
