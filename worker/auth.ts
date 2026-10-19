import { Hono, type Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AppEnv } from "./env.ts";
import { localDevelopment } from "./env.ts";
const keys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
const base64 = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
const random = () => base64(crypto.getRandomValues(new Uint8Array(32)));
export async function hash(value: string) {
  return base64(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  );
}
const auth = new Hono<AppEnv>();
auth.get("/google", async (c) => {
  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET)
    return c.redirect("/?authError=configuration");
  const state = random(),
    nonce = random(),
    verifier = random();
  const secure = new URL(c.req.url).protocol === "https:";
  setCookie(c, "studio_oauth", JSON.stringify({ state, nonce, verifier }), {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/auth",
    maxAge: 600,
  });
  const redirect = new URL("/auth/google/callback", c.req.url).href;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirect,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: await hash(verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return c.redirect(url.href);
});
auth.get("/google/callback", async (c) => {
  try {
    const raw = getCookie(c, "studio_oauth");
    deleteCookie(c, "studio_oauth", { path: "/auth" });
    if (!raw) throw Error("state");
    const pending = JSON.parse(raw);
    if (
      !c.req.query("state") ||
      pending.state !== c.req.query("state") ||
      !c.req.query("code")
    )
      throw Error("state");
    const result = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: c.env.GOOGLE_CLIENT_ID!,
        client_secret: c.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: new URL("/auth/google/callback", c.req.url).href,
        grant_type: "authorization_code",
        code: c.req.query("code")!,
        code_verifier: pending.verifier,
      }),
    });
    if (!result.ok) throw Error("token");
    const { id_token } = (await result.json()) as { id_token: string };
    const { payload } = await jwtVerify(id_token, keys, {
      audience: c.env.GOOGLE_CLIENT_ID,
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    });
    if (
      payload.nonce !== pending.nonce ||
      !payload.email_verified ||
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string"
    )
      throw Error("claims");
    const allowed = c.env.ALLOWED_EMAILS?.split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (allowed?.length && !allowed.includes(payload.email.toLowerCase()))
      return c.redirect("/?authError=notAllowed");
    await c.env.DB.prepare(
      "INSERT INTO users(id,email,name,picture) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,name=excluded.name,picture=excluded.picture",
    )
      .bind(
        payload.sub,
        payload.email,
        String(payload.name ?? payload.email),
        String(payload.picture ?? ""),
      )
      .run();
    const token = random();
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM sessions WHERE expires_at<?").bind(
        Date.now(),
      ),
      c.env.DB.prepare(
        "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
      ).bind(await hash(token), payload.sub, Date.now() + 7 * 86400000),
    ]);
    setCookie(c, "studio_session", token, {
      httpOnly: true,
      secure: new URL(c.req.url).protocol === "https:",
      sameSite: "Lax",
      path: "/",
      maxAge: 7 * 86400,
    });
    return c.redirect("/");
  } catch {
    return c.redirect("/?authError=failed");
  }
});
auth.post("/logout", async (c) => {
  const origin = c.req.header("Origin");
  if (origin !== new URL(c.req.url).origin)
    return c.json({ error: "送信元が不正です" }, 403);
  const token = getCookie(c, "studio_session");
  if (token)
    await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
      .bind(await hash(token))
      .run();
  deleteCookie(c, "studio_session", { path: "/" });
  return c.json({ ok: true });
});
export async function authenticate(c: Context<AppEnv>): Promise<boolean> {
  if (localDevelopment(c.env, c.req.url)) {
    const user = {
      id: "local-developer",
      email: "local@localhost",
      name: "ローカル開発",
      picture: "",
    };
    await c.env.DB.prepare(
      "INSERT OR IGNORE INTO users(id,email,name,picture) VALUES(?,?,?,?)",
    )
      .bind(user.id, user.email, user.name, "")
      .run();
    c.set("user", user);
    return true;
  }
  const token = getCookie(c, "studio_session");
  if (!token) return false;
  const user = await c.env.DB.prepare(
    "SELECT u.id,u.email,u.name,u.picture FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?",
  )
    .bind(await hash(token), Date.now())
    .first<{ id: string; email: string; name: string; picture: string }>();
  if (!user) return false;
  c.set("user", user);
  return true;
}
export default auth;
