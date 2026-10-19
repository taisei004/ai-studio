import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import auth, { authenticate } from "./auth.ts";
import type { AppEnv } from "./env.ts";
import { localDevelopment } from "./env.ts";
import {
  addProject,
  consumeQuota,
  initAgents,
  logStatement,
  now,
  readState,
  uid,
} from "./data.ts";
import { actionSchema, parseBrief, projectSchema, textAI } from "./ai.ts";
const app = new Hono<AppEnv>();
app.use(
  "*",
  secureHeaders({
    referrerPolicy: "strict-origin-when-cross-origin",
    permissionsPolicy: { camera: [], microphone: ["self"], geolocation: [] },
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
    },
  }),
);
app.route("/auth", auth);
app.get("/api/health", (c) => c.json({ ok: true, version: "0.2.0" }));
app.get("/api/session", async (c) => {
  const ok = await authenticate(c);
  c.header("Cache-Control", "no-store");
  return c.json({
    user: ok ? c.get("user") : null,
    googleConfigured: !!(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET),
    development: localDevelopment(c.env, c.req.url),
  });
});
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  if (!(await authenticate(c)))
    return c.json({ error: "Googleでログインしてください" }, 401);
  if (c.req.method !== "GET") {
    const origin = c.req.header("Origin");
    if (origin !== new URL(c.req.url).origin)
      return c.json({ error: "送信元が不正です" }, 403);
  }
  await next();
});
app.use(
  "/api/*",
  bodyLimit({
    maxSize: 8 * 1024 * 1024,
    onError: (c) => c.json({ error: "8MB以下で送信してください" }, 413),
  }),
);
app.get("/api/state", async (c) =>
  c.json(
    await readState(c.env, c.get("user"), localDevelopment(c.env, c.req.url)),
  ),
);
app.post("/api/brief", async (c) => {
  const { text } = z
    .object({ text: z.string().trim().min(1).max(6000) })
    .parse(await c.req.json());
  await consumeQuota(c.env.DB, c.get("user").id, "brief", 30);
  return c.json(await parseBrief(c.env, text));
});
app.post("/api/transcribe", async (c) => {
  if (!c.env.AI) throw Error("Workers AIに接続できません");
  const form = await c.req.formData();
  const audio = form.get("audio");
  if (
    !(audio instanceof File) ||
    audio.size < 100 ||
    audio.size > 8 * 1024 * 1024
  )
    throw Error("有効な音声ファイル（8MB以下）を選択してください");
  if (!/^(audio\/(webm|wav|x-wav|mp4|mpeg|ogg)|video\/webm)/.test(audio.type))
    throw Error("この音声形式には対応していません");
  await consumeQuota(c.env.DB, c.get("user").id, "voice", 30);
  const bytes = new Uint8Array(await audio.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const result = (await c.env.AI.run("@cf/openai/whisper-large-v3-turbo", {
    audio: btoa(binary),
    task: "transcribe",
    vad_filter: true,
  })) as { text?: string };
  if (!result.text?.trim())
    throw Error("音声を聞き取れませんでした。もう一度録音してください");
  return c.json({ text: result.text });
});
app.post("/api/action", async (c) => {
  const input = actionSchema.parse(await c.req.json()),
    db = c.env.DB,
    user = c.get("user");
  const id = input.id ?? "";
  await initAgents(db, user.id);
  if (input.action === "createProject") {
    const draft = projectSchema.parse(input);
    const projectId = await addProject(db, user.id, draft);
    return c.json({
      state: await readState(c.env, user, localDevelopment(c.env, c.req.url)),
      projectId,
    });
  }
  if (input.action === "editProject" || input.action === "deleteProject") {
    const p = await db
      .prepare("SELECT id FROM projects WHERE id=? AND user_id=?")
      .bind(id, user.id)
      .first();
    if (!p) return c.json({ error: "案件が見つかりません" }, 404);
    if (input.action === "editProject") {
      const draft = projectSchema.omit({ template: true }).parse(input);
      await db
        .prepare(
          "UPDATE projects SET name=?,description=?,deadline=? WHERE id=? AND user_id=?",
        )
        .bind(draft.name, draft.description, draft.deadline, id, user.id)
        .run();
    } else {
      if (
        await db
          .prepare(
            "SELECT id FROM tasks WHERE project_id=? AND run_id IS NOT NULL",
          )
          .bind(id)
          .first()
      )
        throw Error("AI実行中の案件は削除できません。完了を待ってください");
      await db
        .prepare("DELETE FROM projects WHERE id=? AND user_id=?")
        .bind(id, user.id)
        .run();
    }
  } else if (input.action === "editAgent") {
    const a = z
      .object({
        name: z.string().trim().min(1).max(120),
        role: z.string().min(1).max(100),
        specialty: z.string().max(1000),
        instructions: z.string().max(4000),
      })
      .parse(input);
    await db
      .prepare(
        "UPDATE agents SET name=?,role=?,specialty=?,instructions=? WHERE id=? AND user_id=?",
      )
      .bind(a.name, a.role, a.specialty, a.instructions, id, user.id)
      .run();
  } else if (["approve", "revise", "hold"].includes(input.action)) {
    const a = await db
      .prepare(
        "SELECT a.id,a.task_id AS taskId,a.status FROM approvals a JOIN tasks t ON a.task_id=t.id JOIN projects p ON t.project_id=p.id WHERE a.id=? AND p.user_id=?",
      )
      .bind(id, user.id)
      .first<{ id: string; taskId: string; status: string }>();
    if (!a) return c.json({ error: "書類が見つかりません" }, 404);
    if (!["pending", "held"].includes(a.status))
      throw Error("この書類は処理済みです");
    const comment = input.comment?.trim() ?? "";
    if (input.action === "revise" && !comment)
      throw Error("修正内容を入力してください");
    const status =
      input.action === "approve"
        ? "approved"
        : input.action === "revise"
          ? "revision"
          : "held";
    const taskStatus =
      input.action === "approve"
        ? "done"
        : input.action === "revise"
          ? "working"
          : "review";
    await db.batch([
      db
        .prepare(
          "UPDATE tasks SET status=?,revision=? WHERE id=? AND status='review' AND EXISTS (SELECT 1 FROM approvals WHERE id=? AND status IN ('pending','held'))",
        )
        .bind(taskStatus, comment, a.taskId, id),
      db
        .prepare(
          "UPDATE approvals SET status=?,comment=? WHERE id=? AND status IN ('pending','held')",
        )
        .bind(status, comment, id),
      logStatement(
        db,
        a.taskId,
        `${input.action === "approve" ? "承認" : input.action === "revise" ? "修正依頼" : "保留"}${comment ? "：" + comment : ""}`,
      ),
    ]);
  } else {
    const task = await db
      .prepare(
        "SELECT t.*,p.name AS project_name,p.description AS project_description FROM tasks t JOIN projects p ON t.project_id=p.id WHERE t.id=? AND p.user_id=?",
      )
      .bind(id, user.id)
      .first<{
        id: string;
        project_id: string;
        agent_id: string;
        title: string;
        status: string;
        position: number;
        run_id: string | null;
        revision: string;
        project_name: string;
        project_description: string;
      }>();
    if (!task) return c.json({ error: "タスクが見つかりません" }, 404);
    if (input.action === "message") {
      const message = input.message?.trim();
      if (!message) throw Error("指示を入力してください");
      await db.batch([
        db
          .prepare("UPDATE tasks SET revision=revision||? WHERE id=?")
          .bind("\n" + message, id),
        logStatement(db, id, "指示：" + message),
      ]);
    } else if (input.action === "start" || input.action === "retry") {
      if (
        await db
          .prepare(
            "SELECT id FROM tasks WHERE project_id=? AND position<? AND status!='done' LIMIT 1",
          )
          .bind(task.project_id, task.position)
          .first()
      )
        throw Error("前の工程を承認してから開始してください");
      const result = await db
        .prepare(
          "UPDATE tasks SET status='working',run_id=NULL,run_started=NULL WHERE id=? AND status IN ('idle','error') AND run_id IS NULL RETURNING id",
        )
        .bind(id)
        .first();
      if (!result) throw Error("開始できない状態です");
      await logStatement(db, id, "作業を開始").run();
    } else if (input.action === "generate") {
      if (task.status !== "working" || task.run_id)
        throw Error("作業中のタスクを選択してください");
      await consumeQuota(db, user.id, "generation", 50);
      const runId = uid();
      const claim = await db
        .prepare(
          "UPDATE tasks SET run_id=?,run_started=? WHERE id=? AND status='working' AND run_id IS NULL RETURNING id",
        )
        .bind(runId, Date.now(), id)
        .first();
      if (!claim) throw Error("既にAIを実行中です");
      await logStatement(db, id, "Workers AIで成果物を生成中").run();
      try {
        const agent = await db
          .prepare(
            "SELECT name,role,specialty,instructions FROM agents WHERE id=? AND user_id=?",
          )
          .bind(task.agent_id, user.id)
          .first<{
            name: string;
            role: string;
            specialty: string;
            instructions: string;
          }>();
        const prior = await db
          .prepare(
            "SELECT a.title,a.content FROM artifacts a JOIN tasks t ON a.task_id=t.id WHERE t.project_id=? AND t.position<=? ORDER BY a.created_at DESC LIMIT 5",
          )
          .bind(task.project_id, task.position)
          .all<{ title: string; content: string }>();
        const output = await textAI(
          c.env,
          `あなたは制作チームの${agent?.role}。得意分野は${agent?.specialty}。日本語で実用的な成果物をMarkdown形式で作る。内部思考は出力しない。実際に調査・実行していないことを実施済みと書かない。外部ブラウザーやコード実行は使えないため、調査結果は未検証の提案として明記する。${agent?.instructions ?? ""}`,
          JSON.stringify({
            project: task.project_name,
            brief: task.project_description,
            task: task.title,
            directions: task.revision,
            prior: prior.results.map((a) => ({
              ...a,
              content: a.content.slice(0, 4000),
            })),
          }),
        );
        const artifactId = uid(),
          approvalId = uid();
        // All changes are one D1 transaction and depend on the same run ownership.
        await db.batch([
          db
            .prepare(
              "INSERT INTO artifacts(id,task_id,title,content,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM tasks WHERE id=? AND run_id=?)",
            )
            .bind(artifactId, id, task.title, output, now(), id, runId),
          db
            .prepare(
              "INSERT INTO approvals(id,task_id,artifact_id) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM artifacts WHERE id=?)",
            )
            .bind(approvalId, id, artifactId, artifactId),
          db
            .prepare(
              "UPDATE tasks SET status='review',run_id=NULL,run_started=NULL WHERE id=? AND run_id=?",
            )
            .bind(id, runId),
          logStatement(db, id, "成果物を作成。承認待ち"),
        ]);
      } catch (error) {
        await db.batch([
          db
            .prepare(
              "UPDATE tasks SET status='error',run_id=NULL,run_started=NULL WHERE id=? AND run_id=?",
            )
            .bind(id, runId),
          logStatement(db, id, "AI生成に失敗。再試行できます"),
        ]);
        throw error;
      }
    }
  }
  return c.json({
    state: await readState(c.env, user, localDevelopment(c.env, c.req.url)),
  });
});
app.onError((error, c) => {
  if (error instanceof z.ZodError)
    return c.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(" / "),
      },
      400,
    );
  console.error("studio-request-error", error.name);
  return c.json(
    {
      error: error.message.includes("SQL")
        ? "保存に失敗しました。再読み込みしてお試しください"
        : error.message,
    },
    400,
  );
});
app.notFound((c) => c.env.ASSETS.fetch(c.req.raw));
export default app;
