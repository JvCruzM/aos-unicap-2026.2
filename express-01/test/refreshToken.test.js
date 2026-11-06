import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes, randomUUID } from "node:crypto";
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
const { default: routes } = await import("../src/routes/session.js");
const { default: errorMiddleware } = await import("../src/middlewares/error.js");

test("sessão persistente: emissão, rotação, expiração, rollback e logout", async (t) => {
  const records = new Map();
  const user = models.User.build({ id: randomUUID(), username: "devuser", email: "dev@unicap.br" });
  user.validatePassword = async (password) => password === "senhaSegura123";
  let failCreate = false;
  const store = (values) => {
    const record = { ...values, user, destroy: async () => records.delete(values.token) };
    records.set(record.token, record);
    return record;
  };
  t.mock.method(models.User, "findByLogin", async () => user);
  t.mock.method(models.RefreshToken, "create", async (values) => {
    if (failCreate) throw new Error("Falha simulada ao persistir o novo token");
    return store(values);
  });
  t.mock.method(models.RefreshToken, "findOne", async (options) => {
    assert.equal(options.lock.level, "UPDATE");
    assert.equal(options.lock.of, models.RefreshToken);
    assert.ok(options.transaction);
    assert.equal(options.include[0].model, models.User);
    return records.get(options.where.token) || null;
  });
  t.mock.method(models.RefreshToken, "destroy", async ({ where }) => Number(records.delete(where.token)));
  t.mock.method(sequelize, "transaction", async (callback) => {
    const before = new Map(records);
    try { return await callback({ LOCK: { UPDATE: "UPDATE" } }); }
    catch (error) {
      records.clear();
      for (const [key, value] of before) records.set(key, value);
      throw error;
    }
  });

  const app = express();
  app.use(express.json());
  app.use("/session", routes);
  app.use(errorMiddleware);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = async (path, body, method = "POST") => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/session${path}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null, text };
  };
  let first, current;

  await t.test("login persiste token opaco de 40 bytes por sete dias", async () => {
    const before = Date.now();
    const result = await request("", { login: "devuser", password: "senhaSegura123" });
    assert.equal(result.status, 200);
    first = result.body.data;
    assert.match(first.refreshToken, /^[0-9a-f]{80}$/);
    const stored = records.get(first.refreshToken);
    assert.equal(stored.userId, user.id);
    const duration = stored.expiresAt.getTime() - before;
    assert.ok(duration >= 7 * 86400000 && duration < 7 * 86400000 + 5000);
    const payload = jwt.verify(first.token, process.env.JWT_SECRET);
    assert.equal(payload.exp - payload.iat, 900);
    assert.equal(first.user.password, undefined);
  });
  await t.test("renovação remove o token anterior e emite um novo par", async () => {
    const result = await request("/refresh", { refreshToken: first.refreshToken });
    assert.equal(result.status, 200);
    current = result.body.data;
    assert.notEqual(current.refreshToken, first.refreshToken);
    assert.notEqual(current.token, first.token);
    assert.equal(records.has(first.refreshToken), false);
    assert.equal(records.has(current.refreshToken), true);
    assert.equal(current.user.id, user.id);
  });
  await t.test("reutilização e token desconhecido retornam 401", async () => {
    for (const refreshToken of [first.refreshToken, randomBytes(40).toString("hex")]) {
      const result = await request("/refresh", { refreshToken });
      assert.equal(result.status, 401);
      assert.equal(result.body.status, "fail");
      assert.equal(result.body.message, "Refresh token inválido ou expirado.");
    }
  });
  await t.test("token expirado não pode renovar a sessão", async () => {
    const token = randomBytes(40).toString("hex");
    store({ token, userId: user.id, expiresAt: new Date(Date.now() - 1000) });
    assert.equal((await request("/refresh", { refreshToken: token })).status, 401);
  });
  await t.test("falha na criação do substituto preserva token anterior", async () => {
    failCreate = true;
    try {
      assert.equal((await request("/refresh", { refreshToken: current.refreshToken })).status, 500);
      assert.ok(records.has(current.refreshToken));
    } finally { failCreate = false; }
  });
  await t.test("logout retorna 204 sem corpo e impede nova renovação", async () => {
    const result = await request("", { refreshToken: current.refreshToken }, "DELETE");
    assert.equal(result.status, 204);
    assert.equal(result.text, "");
    assert.equal(records.has(current.refreshToken), false);
    assert.equal((await request("/refresh", { refreshToken: current.refreshToken })).status, 401);
    assert.equal((await request("", { refreshToken: current.refreshToken }, "DELETE")).status, 204);
  });
  await t.test("refresh e logout exigem refreshToken válido no corpo", async () => {
    for (const body of [{}, { refreshToken: "" }, { refreshToken: 123 }]) {
      assert.equal((await request("/refresh", body)).status, 400);
      assert.equal((await request("", body, "DELETE")).status, 400);
    }
  });
});
