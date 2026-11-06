import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import express from "express";
import { z } from "zod";

Object.assign(process.env, {
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  ALLOWED_ORIGINS: "http://localhost:3000",
  JWT_SECRET: "testsecretpassword",
  NODE_ENV: "test",
});
const { default: models, sequelize } = await import("../src/models/index.js");
const { default: routes } = await import("../src/routes/tarefa.js");
const { default: errorMiddleware } = await import("../src/middlewares/error.js");

test("CRUD de tarefas com validação Zod", async (t) => {
  const records = new Map();
  const qi = sequelize.getQueryInterface();
  t.mock.method(qi, "insert", async (instance) => {
    records.set(instance.objectId, instance);
    return [instance, 1];
  });
  t.mock.method(qi, "update", async (instance) => [instance, 1]);
  t.mock.method(models.Tarefa, "findByPk", async (id) => records.get(id) || null);
  t.mock.method(models.Tarefa, "findAll", async () => [...records.values()]);
  t.mock.method(models.Tarefa, "destroy", async ({ where }) => Number(records.delete(where.objectId)));

  const app = express();
  app.use(express.json());
  app.use("/tarefas", routes);
  app.use(errorMiddleware);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = async (method, path = "", body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/tarefas${path}`, {
      method, headers: { "Content-Type": "application/json" },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  };
  let objectId;

  await t.test("cria UUID v4 no back-end e aplica concluida=false", async () => {
    const result = await request("POST", "", { descricao: " Estudar Zod ", objectId: randomUUID(), extra: true });
    assert.equal(result.status, 201);
    objectId = result.body.objectId;
    assert.ok(z.string().uuid({ version: "v4" }).safeParse(objectId).success);
    assert.equal(result.body.descricao, "Estudar Zod");
    assert.equal(result.body.concluida, false);
    assert.equal(result.body.extra, undefined);
    const done = await request("POST", "", { descricao: "Concluída", concluida: true });
    assert.equal(done.status, 201);
    assert.equal(done.body.concluida, true);
  });
  await t.test("lista tarefas e busca por objectId", async () => {
    const list = await request("GET");
    assert.equal(list.status, 200);
    assert.ok(Array.isArray(list.body));
    assert.ok(list.body.some((tarefa) => tarefa.objectId === objectId));
    const item = await request("GET", `/${objectId}`);
    assert.equal(item.status, 200);
    assert.equal(item.body.objectId, objectId);
  });
  await t.test("PUT aceita um ou ambos os campos, preservando os omitidos", async () => {
    let result = await request("PUT", `/${objectId}`, { concluida: true });
    assert.equal(result.status, 200);
    assert.equal(result.body.descricao, "Estudar Zod");
    assert.equal(result.body.concluida, true);
    result = await request("PUT", `/${objectId}`, { descricao: "Descrição atualizada" });
    assert.equal(result.body.concluida, true);
    result = await request("PUT", `/${objectId}`, { descricao: "Ambos", concluida: false });
    assert.equal(result.body.descricao, "Ambos");
    assert.equal(result.body.concluida, false);
  });
  await t.test("dados ausentes, vazios ou de tipo incorreto retornam 400 padronizado", async () => {
    for (const body of [{}, { descricao: " " }, { descricao: 123 }, { descricao: "Teste", concluida: "false" }, { descricao: "Teste", concluida: null }]) {
      const result = await request("POST", "", body);
      assert.equal(result.status, 400);
      assert.equal(result.body.status, "fail");
      assert.equal(result.body.message, result.body.errors.join("; "));
    }
    for (const body of [{}, { descricao: "" }, { concluida: "true" }, { extra: true }]) {
      assert.equal((await request("PUT", `/${objectId}`, body)).status, 400);
    }
    for (const method of ["GET", "PUT", "DELETE"]) {
      assert.equal((await request(method, "/id-invalido", method === "PUT" ? { concluida: true } : undefined)).status, 400);
    }
  });
  await t.test("UUID inexistente retorna 404 em GET, PUT e DELETE", async () => {
    for (const method of ["GET", "PUT", "DELETE"]) {
      const result = await request(method, `/${randomUUID()}`, method === "PUT" ? { concluida: true } : undefined);
      assert.equal(result.status, 404);
      assert.equal(result.body.status, "fail");
      assert.equal(result.body.message, "Tarefa não encontrada.");
    }
  });
  await t.test("DELETE remove tarefa e retorna mensagem de sucesso", async () => {
    const result = await request("DELETE", `/${objectId}`);
    assert.equal(result.status, 200);
    assert.equal(result.body.message, "Tarefa excluída com sucesso.");
    assert.equal((await request("GET", `/${objectId}`)).status, 404);
    assert.equal((await request("DELETE", `/${objectId}`)).status, 404);
  });
});
