import "dotenv/config";
import { env } from "../src/utils/env.js";
import Sequelize from "sequelize";
import getUserModel from "../src/models/user.js";
import getRefreshTokenModel from "../src/models/refreshToken.js";

const url = new URL(process.env.DATABASE_URL_UNPOOLED || env.DATABASE_URL);
if (url.hostname.endsWith(".neon.tech")) {
  url.hostname = url.hostname.replace("-pooler.", ".");
}
const db = new Sequelize(url.toString(), {
  logging: false,
  dialectOptions: { connectionTimeoutMillis: 10000 },
});
const models = {
  User: getUserModel(db, Sequelize),
  RefreshToken: getRefreshTokenModel(db, Sequelize),
};
models.RefreshToken.associate(models);

try {
  // Cria somente a nova tabela, sem force/alter nas tabelas existentes.
  await models.RefreshToken.sync();
  console.log("Tabela de refresh tokens pronta, com vínculo ao usuário e exclusão em cascata.");
} catch (error) {
  console.error("Não foi possível criar a tabela de refresh tokens:", error.name);
  process.exitCode = 1;
} finally {
  await db.close();
}
