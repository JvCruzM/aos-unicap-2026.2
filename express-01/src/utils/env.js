import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(4001),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  ALLOWED_ORIGINS: z.string(),
  JWT_SECRET: z.preprocess(
    (value) => value ?? process.env.MY_SECRET,
    z.string().min(10),
  ),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Variáveis de ambiente ausentes ou inválidas:");
  for (const issue of result.error.issues) {
    console.error(`- ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = result.data;
