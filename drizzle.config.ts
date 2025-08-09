import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts", 
  out: "./drizzle", 
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.PGHOST || "",
    user: process.env.PGUSER || "",
    password: process.env.PGPASSWORD || "",
    database: process.env.PGDATABASE || "",
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  },
});
