import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

function createTursoClient(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL environment variable is required");
  }

  return createClient({
    url,
    authToken,
  });
}

let tursoClientInstance: Client | undefined;

export function getTursoClient(): Client {
  if (!tursoClientInstance) {
    tursoClientInstance = createTursoClient();
  }
  return tursoClientInstance;
}

export function getDb() {
  return drizzle(getTursoClient(), { schema });
}
