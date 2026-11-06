import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";

Object.assign(process.env, {
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  ALLOWED_ORIGINS: "http://localhost:3000",
  JWT_SECRET: "testsecretpassword",
  NODE_ENV: "test",
});
const { default: models, sequelize } = await import("../src/models/index.js");
const { default: users } = await import("../src/routes/user.js");
const { default: session } = await import("../src/routes/session.js");
const { default: messages } = await import("../src/routes/message.js");
const { default: errorMiddleware } = await import("../src/middlewares/error.js");

test("cadastro, hooks Argon2, login JWT, proteção e rate limiter", async (t) => {
  // Somente a persistência é simulada; Sequelize, hooks, Argon2 e JWT são reais.
  const records = new Map();
  const queryInterface = sequelize.getQueryInterface();
  t.mock.method(queryInterface, "insert", async (instance) => {
    records.set(instance.id, instance);
    return [instance, 1];
  });
  t.mock.method(queryInterface, "update", async (instance) => [instance, 1]);
  t.mock.method(models.User, "findOne", async ({ where }) =>
    [...records.values()].find((user) => Object.entries(where).every(([key, value]) => user[key] === value)) ?? null);
  t.mock.method(models.User, "findByPk", async (id) => records.get(id) ?? null);
  const app = express();
  app.use(express.json());
  app.use("/users", users);
  app.use("/session", session);
  app.use("/messages", messages);
  app.use(errorMiddleware);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, { method = "GET", body, token } = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
      ...(body && { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  };
  const credentials = { username: "devuser", email: "dev@unicap.br", password: "senhaSegura123" };
  let result = await request("/users", { method: "POST", body: credentials });
  assert.equal(result.status, 201);
  assert.equal(result.body.password, undefined);
  const user = records.get(result.body.id);
  assert.match(user.password, /^\$argon2id\$/);
  assert.ok(await user.validatePassword(credentials.password));
  assert.equal(await user.validatePassword("senhaErrada"), false);
  assert.equal(JSON.stringify(user).includes(user.password), false);
  await assert.rejects(models.User.create({ ...credentials, username: "short", password: "123" }));
  await assert.rejects(models.User.create({ ...credentials, username: "long", password: "x".repeat(43) }));
  const originalHash = user.password;
  await user.update({ username: "changed" });
  assert.equal(user.password, originalHash);
  await user.update({ username: credentials.username, password: "novaSenha123" });
  assert.notEqual(user.password, originalHash);
  assert.ok(await user.validatePassword("novaSenha123"));
  assert.equal(await user.validatePassword(credentials.password), false);

  result = await request("/session", { method: "POST", body: { login: credentials.username, password: "novaSenha123" } });
  assert.equal(result.status, 200);
  assert.equal(result.body.status, "success");
  assert.deepEqual(result.body.data.user, { id: user.id, username: user.username, email: user.email });
  const token = result.body.data.token;
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  assert.equal(payload.exp - payload.iat, 900);
  assert.equal(payload.password, undefined);
  result = await request("/session", { token });
  assert.equal(result.status, 200);
  assert.equal(result.body.id, user.id);
  assert.equal(result.body.password, undefined);
  for (const value of [undefined, "invalid", jwt.sign({ id: user.id }, "othersecret"), jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: -1 })]) {
    result = await request("/session", { token: value });
    assert.equal(result.status, 401);
    assert.equal(result.body.status, "fail");
  }
  const removedToken = jwt.sign({ id: "550e8400-e29b-41d4-a716-446655440000" }, process.env.JWT_SECRET);
  assert.equal((await request("/session", { token: removedToken })).status, 401);
  for (let count = 0; count < 6; count++) {
    assert.equal((await request("/session", { token })).status, 200);
  }
  assert.equal((await request("/messages", { method: "POST", body: { text: "hello" } })).status, 401);
  for (const login of [credentials.username, "inexistente"]) {
    result = await request("/session", { method: "POST", body: { login, password: "senhaErrada" } });
    assert.equal(result.status, 401);
    assert.equal(result.body.message, "Credenciais inválidas.");
  }
  for (const identifier of [{ email: credentials.email }, { username: credentials.username }]) {
    assert.equal((await request("/session", { method: "POST", body: { ...identifier, password: "novaSenha123" } })).status, 200);
  }
  assert.equal((await request("/session", { method: "POST", body: { login: credentials.username, password: "novaSenha123" } })).status, 429);
  assert.equal((await request("/session", { token })).status, 200);
});
