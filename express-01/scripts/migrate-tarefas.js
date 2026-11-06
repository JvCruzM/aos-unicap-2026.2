import "dotenv/config";
import { env } from "../src/utils/env.js";
import Sequelize from "sequelize";
import getTarefaModel from "../src/models/tarefa.js";

const url = new URL(process.env.DATABASE_URL_UNPOOLED || env.DATABASE_URL);
if (url.hostname.endsWith(".neon.tech")) {
  url.hostname = url.hostname.replace("-pooler.", ".");
}
const db = new Sequelize(url.toString(), {
  logging: false,
  dialectOptions: { connectionTimeoutMillis: 10000 },
});

try {
  await getTarefaModel(db, Sequelize).sync();
  console.log("Tabela tarefas pronta; tabelas existentes preservadas.");
} catch (error) {
  console.error("Não foi possível criar a tabela tarefas:", error.name);
  process.exitCode = 1;
} finally {
  await db.close();
}
