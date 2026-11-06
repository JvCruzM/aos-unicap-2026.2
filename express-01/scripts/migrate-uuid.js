import "dotenv/config";
import { env } from "../src/utils/env.js";
import assert from "node:assert/strict";
import Sequelize, { DataTypes, QueryTypes } from "sequelize";

const url = new URL(process.env.DATABASE_URL_UNPOOLED || env.DATABASE_URL);
if (url.hostname.endsWith(".neon.tech")) {
  url.hostname = url.hostname.replace("-pooler.", ".");
}
const db = new Sequelize(url.toString(), {
  logging: false,
  dialectOptions: { connectionTimeoutMillis: 10000 },
});

const snapshot = async (transaction) => {
  const users = await db.query(`
    SELECT (to_jsonb(u) - 'id' - 'legacyId') ||
      jsonb_build_object('originalId', coalesce(to_jsonb(u)->'legacyId', to_jsonb(u)->'id')) AS data
    FROM "users" u`, { type: QueryTypes.SELECT, transaction });
  const messages = await db.query(`
    SELECT (to_jsonb(m) - 'id' - 'userId' - 'legacyId') ||
      jsonb_build_object('originalId', coalesce(to_jsonb(m)->'legacyId', to_jsonb(m)->'id'),
        'owner', u."username") AS data
    FROM "messages" m LEFT JOIN "users" u ON m."userId" = u."id"`,
  { type: QueryTypes.SELECT, transaction });
  return {
    users: users.map(({ data }) => JSON.stringify(data)).sort(),
    messages: messages.map(({ data }) => JSON.stringify(data)).sort(),
  };
};

try {
  await db.transaction(async (transaction) => {
    await db.query("SET LOCAL lock_timeout = '5s'", { transaction });
    await db.query("SET LOCAL statement_timeout = '30s'", { transaction });
    await db.query('LOCK TABLE "users", "messages" IN ACCESS EXCLUSIVE MODE', { transaction });
    const qi = db.getQueryInterface();
    const users = await qi.describeTable("users", { transaction });
    const messages = await qi.describeTable("messages", { transaction });
    if (users.id.type === "UUID" && messages.id.type === "UUID" && messages.userId.type === "UUID") {
      assert.ok(users.legacyId && messages.legacyId, "Colunas legacyId ausentes");
      console.log("Banco já atualizado para UUID com legacyId.");
      return;
    }
    assert.equal(users.id.type, "INTEGER");
    assert.equal(messages.id.type, "INTEGER");
    assert.equal(messages.userId.type, "INTEGER");
    assert.ok(!users.legacyId && !messages.legacyId, "Colunas legacyId já existem; revise antes de migrar");
    const before = await snapshot(transaction);

    for (const table of ["users", "messages"]) {
      await qi.addColumn(table, "legacyId", {
        type: DataTypes.INTEGER, allowNull: true, unique: true,
      }, { transaction });
      await db.query(`UPDATE "${table}" SET "legacyId" = "id"`, { transaction });
      await db.query(`ALTER TABLE "${table}" ADD COLUMN "_migration_uuid" UUID NOT NULL DEFAULT gen_random_uuid()`, { transaction });
    }
    await db.query('ALTER TABLE "messages" ADD COLUMN "_migration_user_uuid" UUID', { transaction });
    await db.query('UPDATE "messages" m SET "_migration_user_uuid" = u."_migration_uuid" FROM "users" u WHERE m."userId" = u."id"', { transaction });
    const references = await qi.getForeignKeyReferencesForTable("messages", { transaction });
    for (const reference of references.filter((item) => item.columnName === "userId")) {
      await qi.removeConstraint("messages", reference.constraintName, { transaction });
    }
    for (const table of ["users", "messages"]) {
      await db.query(`ALTER TABLE "${table}" ALTER COLUMN "id" DROP IDENTITY IF EXISTS,
        ALTER COLUMN "id" DROP DEFAULT,
        ALTER COLUMN "id" TYPE UUID USING "_migration_uuid",
        ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`, { transaction });
    }
    await db.query('ALTER TABLE "messages" ALTER COLUMN "userId" TYPE UUID USING "_migration_user_uuid"', { transaction });
    await qi.addConstraint("messages", {
      fields: ["userId"], type: "foreign key", name: "messages_userId_fkey",
      references: { table: "users", field: "id" },
      onDelete: "CASCADE", onUpdate: "CASCADE", transaction,
    });
    await qi.removeColumn("users", "_migration_uuid", { transaction });
    await qi.removeColumn("messages", "_migration_uuid", { transaction });
    await qi.removeColumn("messages", "_migration_user_uuid", { transaction });
    assert.deepEqual(await snapshot(transaction), before, "Dados, IDs legados ou vínculos divergiram");
    console.log(`Preservados: ${before.users.length} usuários e ${before.messages.length} mensagens, com números antigos em legacyId.`);
    if (process.argv.includes("--dry-run")) {
      throw Object.assign(new Error("Ensaio concluído; transação revertida."), { code: "DRY_RUN" });
    }
  });
  console.log("Migração UUID concluída.");
} catch (error) {
  if (error.code === "DRY_RUN") console.log(error.message);
  else {
    console.error("Migração revertida:", error.name, error.original?.code || "");
    process.exitCode = 1;
  }
} finally {
  await db.close();
}
