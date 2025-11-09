import dotenv from "dotenv";

dotenv.config({
	path: "../../apps/server/.env",
});

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as authSchema from "./schema/auth";
import * as shopSchema from "./schema/shop";

neonConfig.webSocketConstructor = ws;

// To work in edge environments (Cloudflare Workers, Vercel Edge, etc.), enable querying over fetch
// neonConfig.poolQueryViaFetch = true

const pool = new Pool({ connectionString: process.env.DATABASE_URL || "" });
export const db = drizzle(pool, {
  schema: { ...authSchema, ...shopSchema }
});

// Export all schemas
export * from "./schema/auth";
export * from "./schema/shop";
export * from "./queries/shop";

export type Database = typeof db;
export { eq } from "drizzle-orm";
