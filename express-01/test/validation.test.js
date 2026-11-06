import assert from "node:assert/strict";
import { once } from "node:events";
import { after, test } from "node:test";
import express from "express";
import { z } from "zod";
import { validate } from "../src/middlewares/validate.js";
import {
  createUserSchema,
  createMessageSchema,
  userIdParamSchema,
  messageIdParamSchema,
} from "../src/middlewares/validationSchemas.js";

// Configuração isolada: estes testes não carregam o .env nem acessam o banco.
Object.assign(process.env, {
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  ALLOWED_ORIGINS: "http://localhost:3000",
  JWT_SECRET: "testsecretpassword",
  NODE_ENV: "test",
});

const { default: errorMiddleware } = await import("../src/middlewares/error.js");
const { default: userRoutes } = await import("../src/routes/user.js");
const { default: messageRoutes } = await import("../src/routes/message.js");
const app = express();
app.use(express.json());
app.use("/users", userRoutes);
app.use("/messages", messageRoutes);
app.post("/sanitized", validate(createUserSchema), (req, res) => res.json(req.body));
app.get(
  "/query",
  validate(z.object({ query: z.object({ page: z.coerce.number().int().min(1) }) })),
  (req, res) => res.json(req.query),
);
app.use(errorMiddleware);
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${server.address().port}`;
after(() => new Promise((resolve) => server.close(resolve)));

async function badRequest(path, method = "GET", body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  assert.equal(response.status, 400);
  const result = await response.json();
  assert.equal(result.status, "fail");
  assert.ok(Array.isArray(result.errors) && result.errors.length > 0);
  assert.equal(result.message, result.errors.join("; "));
  return result;
}

test("JSON malformado retorna 400 no formato padronizado", async () => {
  const response = await fetch(`${base}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{username: "teste"}',
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    status: "fail",
    message: "body: JSON malformado",
    errors: ["body: JSON malformado"],
  });
});

test("POST /users exige e-mail e rejeita formato inválido", async () => {
  for (const body of [{ username: "teste" }, { username: "teste", email: "inválido" }]) {
    const result = await badRequest("/users", "POST", body);
    assert.ok(result.errors.some((error) => error.startsWith("body.email:")));
  }
});

test("todas as rotas com ID rejeitam UUID inválido antes do controlador", async () => {
  for (const resource of ["users", "messages"]) {
    for (const method of ["GET", "PUT", "DELETE"]) {
      const result = await badRequest(`/${resource}/id-invalido`, method);
      const field = resource === "users" ? "userId" : "messageId";
      assert.ok(result.errors.some((error) => error.startsWith(`params.${field}:`)));
    }
  }
});

test("POST /messages rejeita texto ausente, vazio, em branco ou acima do limite", async () => {
  for (const body of [{}, { text: "" }, { text: "   " }, { text: "a".repeat(1001) }]) {
    const result = await badRequest("/messages", "POST", body);
    assert.ok(result.errors.some((error) => error.startsWith("body.text:")));
  }
});

test("schemas aceitam UUID v4 e rejeitam outra versão", async () => {
  for (const [schema, field] of [[userIdParamSchema, "userId"], [messageIdParamSchema, "messageId"]]) {
    await schema.parseAsync({ params: { [field]: "550e8400-e29b-41d4-a716-446655440000" } });
    await assert.rejects(schema.parseAsync({ params: { [field]: "550e8400-e29b-11d4-a716-446655440000" } }), z.ZodError);
  }
  await createMessageSchema.parseAsync({ body: { text: "a".repeat(1000) } });
});

test("dados válidos chegam sanitizados ao próximo middleware", async () => {
  const response = await fetch(`${base}/sanitized`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: " teste ", email: " teste@example.com ", admin: true }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { username: "teste", email: "teste@example.com" });
});

test("query validada e convertida funciona no Express 5", async () => {
  const response = await fetch(`${base}/query?page=2&extra=remover`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { page: 2 });
  await badRequest("/query?page=inválido");
});
