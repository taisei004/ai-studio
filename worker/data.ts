import type { Env } from "./env.ts";
import {
  initialAgents,
  workflow,
  type User,
  type StudioState,
  type ProjectDraft,
} from "../shared/studio.ts";
export const now = () => new Date().toISOString();
export const uid = () => crypto.randomUUID();
export async function initAgents(db: D1Database, userId: string) {
  await db.batch(
    initialAgents.map((a) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO agents(id,user_id,name,role,specialty,instructions,color) VALUES(?,?,?,?,?,?,?)",
        )
        .bind(
          a.id,
          userId,
          a.name,
          a.role,
          a.specialty,
          a.instructions,
          a.color,
        ),
    ),
  );
}
export async function addProject(
  db: D1Database,
  userId: string,
  draft: ProjectDraft,
) {
  const id = uid(),
    created = now();
  const statements = [
    db
      .prepare(
        "INSERT INTO projects(id,user_id,name,description,deadline,template,created_at) VALUES(?,?,?,?,?,?,?)",
      )
      .bind(
        id,
        userId,
        draft.name,
        draft.description,
        draft.deadline,
        draft.template,
        created,
      ),
    ...workflow(draft.template).map(([title, agentId], i) =>
      db
        .prepare(
          "INSERT INTO tasks(id,project_id,agent_id,title,position) VALUES(?,?,?,?,?)",
        )
        .bind(uid(), id, agentId, title, i),
    ),
  ];
  await db.batch(statements);
  return id;
}
export async function readState(
  env: Env,
  user: User,
  development: boolean,
): Promise<StudioState> {
  const db = env.DB;
  await initAgents(db, user.id);
  // Repair an interrupted request after 5 minutes, without silently marking it complete.
  await db
    .prepare(
      "UPDATE tasks SET status='error',run_id=NULL,run_started=NULL WHERE project_id IN (SELECT id FROM projects WHERE user_id=?) AND run_id IS NOT NULL AND run_started<?",
    )
    .bind(user.id, Date.now() - 300000)
    .run();
  const scoped = "SELECT id FROM projects WHERE user_id=?";
  const [projects, agents, tasks, approvals, artifacts, logs] = await db.batch([
    db
      .prepare(
        "SELECT id,name,description,deadline,template,created_at AS createdAt FROM projects WHERE user_id=? ORDER BY created_at DESC",
      )
      .bind(user.id),
    db
      .prepare(
        "SELECT id,name,role,specialty,instructions,color FROM agents WHERE user_id=? ORDER BY rowid",
      )
      .bind(user.id),
    db
      .prepare(
        `SELECT id,project_id AS projectId,agent_id AS agentId,title,status,position AS "order",run_id AS runId,revision FROM tasks WHERE project_id IN (${scoped}) ORDER BY position`,
      )
      .bind(user.id),
    db
      .prepare(
        `SELECT id,task_id AS taskId,artifact_id AS artifactId,status,comment FROM approvals WHERE task_id IN (SELECT id FROM tasks WHERE project_id IN (${scoped})) ORDER BY rowid DESC`,
      )
      .bind(user.id),
    db
      .prepare(
        `SELECT id,task_id AS taskId,title,content,created_at AS createdAt FROM artifacts WHERE task_id IN (SELECT id FROM tasks WHERE project_id IN (${scoped})) ORDER BY created_at DESC`,
      )
      .bind(user.id),
    db
      .prepare(
        `SELECT id,task_id AS taskId,message,created_at AS createdAt FROM logs WHERE task_id IN (SELECT id FROM tasks WHERE project_id IN (${scoped})) ORDER BY created_at DESC LIMIT 100`,
      )
      .bind(user.id),
  ]);
  return {
    user,
    projects: projects.results,
    agents: agents.results,
    tasks: tasks.results,
    approvals: approvals.results,
    artifacts: artifacts.results,
    logs: logs.results,
    mode: development ? "development" : "cloud",
    aiAvailable: !!env.AI,
  } as unknown as StudioState;
}
export function logStatement(db: D1Database, taskId: string, message: string) {
  return db
    .prepare("INSERT INTO logs(id,task_id,message,created_at) VALUES(?,?,?,?)")
    .bind(uid(), taskId, message, now());
}
export async function consumeQuota(
  db: D1Database,
  userId: string,
  kind: string,
  limit = 50,
) {
  const result = await db
    .prepare(
      "INSERT INTO usage(user_id,day,kind,count) VALUES(?,?,?,1) ON CONFLICT(user_id,day,kind) DO UPDATE SET count=count+1 WHERE count<? RETURNING count",
    )
    .bind(userId, new Date().toISOString().slice(0, 10), kind, limit)
    .first();
  if (!result)
    throw Error("本日のAI利用上限に達しました。翌日もう一度お試しください。");
}
