import type { User } from "../shared/studio.ts";
export interface Env {
  DB: D1Database;
  AI: Ai;
  ASSETS: Fetcher;
  ENVIRONMENT?: string;
  AI_MODEL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  ALLOWED_EMAILS?: string;
}
export type AppEnv = { Bindings: Env; Variables: { user: User } };
export function localDevelopment(env: Env, url: string) {
  const host = new URL(url).hostname;
  return (
    env.ENVIRONMENT === "development" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(host)
  );
}
