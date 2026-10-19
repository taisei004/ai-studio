import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Miniflare } from "miniflare";
import app from "../worker/index.ts";
import { hash } from "../worker/auth.ts";
import type { Env } from "../worker/env.ts";
import type { StudioState } from "../shared/studio.ts";
import { locationFor, taskProgress } from "../shared/studio.ts";
import { consumeQuota } from "../worker/data.ts";
async function fixture(aiRun?: () => Promise<unknown>) {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("ok")}}',
    compatibilityDate: "2026-07-30",
    d1Databases: ["DB"],
  });
  const db = await mf.getD1Database("DB");
  const sql = readFileSync(
    new URL("../migrations/0001_studio.sql", import.meta.url),
    "utf8",
  );
  for (const statement of sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await db.prepare(statement).run();
  const env = {
    DB: db,
    ENVIRONMENT: "development",
    AI: {
      run:
        aiRun ??
        (async () => ({ response: "# テスト成果物\n実行契約の検証用" })),
    },
  } as unknown as Env;
  const call = (
    path: string,
    body?: unknown,
    overrides: Partial<Env> = {},
    headers: Record<string, string> = {},
  ) =>
    app.request(
      "http://localhost" + path,
      {
        ...(body !== undefined
          ? {
              method: "POST",
              body: JSON.stringify(body),
              headers: {
                "Content-Type": "application/json",
                Origin: "http://localhost",
                ...headers,
              },
            }
          : { headers }),
      },
      { ...env, ...overrides },
    );
  return { mf, db, env, call };
}
test("D1 lifecycle: room movement, real action contract, revisions, approvals, cascade", async () => {
  const f = await fixture();
  try {
    let state = (await (await f.call("/api/state")).json()) as StudioState;
    assert.equal(state.agents.length, 6);
    assert.equal(state.projects.length, 0);
    let result = (await (
      await f.call("/api/action", {
        action: "createProject",
        name: "テスト番組",
        description: "検証",
        template: "program",
      })
    ).json()) as { state: StudioState; projectId: string };
    state = result.state;
    assert.equal(state.tasks.length, 7);
    const task = state.tasks[0],
      second = state.tasks[1];
    assert.equal(locationFor("researcher", state.tasks), "lounge");
    assert.equal(
      (await f.call("/api/action", { action: "start", id: second.id })).status,
      400,
    );
    assert.equal(
      (await f.call("/api/action", { action: "createProject", name: "  " }))
        .status,
      400,
    );
    assert.equal(
      (
        await f.call("/api/action", {
          action: "editProject",
          id: result.projectId,
          name: "編集済み",
          description: "更新",
          deadline: "2026-10-31",
        })
      ).status,
      200,
    );
    await f.call("/api/action", { action: "start", id: task.id });
    state = (await (await f.call("/api/state")).json()) as StudioState;
    assert.equal(locationFor("researcher", state.tasks), "research");
    await f.call("/api/action", {
      action: "message",
      id: task.id,
      message: "尺を40分に",
    });
    await f.call("/api/action", { action: "generate", id: task.id });
    state = (await (await f.call("/api/state")).json()) as StudioState;
    assert.equal(locationFor("researcher", state.tasks), "meeting");
    assert.equal(taskProgress(state.tasks), 0);
    assert.equal(state.artifacts.length, 1);
    const approval = state.approvals[0];
    await f.call("/api/action", { action: "hold", id: approval.id });
    assert.equal(
      (
        await f.call("/api/action", {
          action: "revise",
          id: approval.id,
          comment: "",
        })
      ).status,
      400,
    );
    await f.call("/api/action", {
      action: "revise",
      id: approval.id,
      comment: "簡潔に",
    });
    state = (await (await f.call("/api/state")).json()) as StudioState;
    assert.equal(state.tasks[0].status, "working");
    await f.call("/api/action", { action: "generate", id: task.id });
    state = (await (await f.call("/api/state")).json()) as StudioState;
    assert.equal(state.artifacts.length, 2);
    const next = state.approvals.find((a) => a.status === "pending")!;
    await f.call("/api/action", { action: "approve", id: next.id });
    assert.equal(
      (await f.call("/api/action", { action: "approve", id: next.id })).status,
      400,
    );
    state = (await (await f.call("/api/state")).json()) as StudioState;
    assert.equal(taskProgress(state.tasks), 14);
    assert.equal(locationFor("researcher", state.tasks), "lounge");
    await f.call("/api/action", { action: "start", id: second.id });
    await f.call("/api/action", {
      action: "editAgent",
      id: "producer",
      name: "Director",
      role: "進行",
      specialty: "設計",
      instructions: "日本語",
    });
    state = (await (await f.call("/api/state")).json()) as StudioState;
    assert.equal(
      state.agents.find((a) => a.id === "producer")?.name,
      "Director",
    );
    await f.call("/api/action", {
      action: "deleteProject",
      id: result.projectId,
    });
    state = (await (await f.call("/api/state")).json()) as StudioState;
    assert.equal(state.tasks.length, 0);
    assert.equal(state.artifacts.length, 0);
    assert.equal(state.approvals.length, 0);
    assert.equal(state.logs.length, 0);
  } finally {
    await f.mf.dispose();
  }
});
test("production authentication, owner isolation, CSRF and OAuth callback validation", async () => {
  const f = await fixture();
  try {
    const production = { ENVIRONMENT: "production" };
    assert.equal(
      (await f.call("/api/state", undefined, production)).status,
      401,
    );
    assert.equal(
      (await f.call("/api/state", undefined, { ENVIRONMENT: "development" }))
        .status,
      200,
    );
    const external = await app.request(
      "https://public.example/api/state",
      {},
      f.env,
    );
    assert.equal(
      external.status,
      401,
      "dev bypass must never work on a public hostname",
    );
    const create = (await (
      await f.call("/api/action", {
        action: "createProject",
        name: "所有者の案件",
        template: "web",
      })
    ).json()) as { projectId: string; state: StudioState };
    await f.db
      .prepare(
        "INSERT INTO users(id,email,name) VALUES('other','other@example.invalid','other')",
      )
      .run();
    await f.db
      .prepare(
        "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
      )
      .bind(await hash("other-token"), "other", Date.now() + 100000)
      .run();
    const headers = { Cookie: "studio_session=other-token" };
    const other = (await (
      await f.call("/api/state", undefined, production, headers)
    ).json()) as StudioState;
    assert.equal(other.projects.length, 0);
    assert.equal(other.user.id, "other");
    assert.equal(
      (
        await f.call(
          "/api/action",
          { action: "deleteProject", id: create.projectId },
          production,
          headers,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await f.call(
          "/api/action",
          { action: "start", id: create.state.tasks[0].id },
          production,
          headers,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await f.call(
          "/api/action",
          { action: "createProject", name: "CSRF" },
          production,
          { ...headers, Origin: "https://evil.example" },
        )
      ).status,
      403,
    );
    const callback = await f.call(
      "/auth/google/callback?state=forged&code=forged",
    );
    assert.equal(callback.status, 302);
    assert.ok(callback.headers.get("location")?.includes("authError=failed"));
    const signin = await f.call("/auth/google", undefined, {
      GOOGLE_CLIENT_ID: "client",
      GOOGLE_CLIENT_SECRET: "secret",
    });
    const oauth = new URL(signin.headers.get("location")!);
    assert.equal(oauth.hostname, "accounts.google.com");
    assert.equal(oauth.searchParams.get("code_challenge_method"), "S256");
    assert.ok(signin.headers.get("set-cookie")?.includes("HttpOnly"));
  } finally {
    await f.mf.dispose();
  }
});
test("AI execution has a lease, rejects duplicate generation, preserves errors for retry", async () => {
  let release: (value: unknown) => void = () => {};
  const f = await fixture(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  try {
    await f.call("/api/state");
    const created = (await (
      await f.call("/api/action", {
        action: "createProject",
        name: "並列検証",
        template: "custom",
      })
    ).json()) as { state: StudioState };
    const task = created.state.tasks[0];
    await f.call("/api/action", { action: "start", id: task.id });
    const running = f.call("/api/action", { action: "generate", id: task.id });
    for (let i = 0; i < 100; i++) {
      const s = (await (await f.call("/api/state")).json()) as StudioState;
      if (s.tasks[0].runId) break;
      await new Promise((r) => setTimeout(r, 10));
    }
    assert.equal(
      (await f.call("/api/action", { action: "generate", id: task.id })).status,
      400,
    );
    assert.equal(
      (
        await f.call("/api/action", {
          action: "deleteProject",
          id: task.projectId,
        })
      ).status,
      400,
    );
    release({ response: "検証成果物" });
    assert.equal((await running).status, 200);
    const created2 = (await (
      await f.call("/api/action", {
        action: "createProject",
        name: "エラー検証",
        template: "custom",
      })
    ).json()) as { state: StudioState; projectId: string };
    const task2 = created2.state.tasks.find(
      (t) => t.projectId === created2.projectId,
    )!;
    await f.call("/api/action", { action: "start", id: task2.id });
    const failing = {
      ...f.env,
      AI: {
        run: async () => {
          throw Error("AI unavailable");
        },
      },
    } as unknown as Env;
    const response = await app.request(
      "http://localhost/api/action",
      {
        method: "POST",
        headers: {
          Origin: "http://localhost",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "generate", id: task2.id }),
      },
      failing,
    );
    assert.equal(response.status, 400);
    const state = (await (await f.call("/api/state")).json()) as StudioState;
    assert.equal(state.tasks.find((t) => t.id === task2.id)?.status, "error");
    assert.equal(
      locationFor(
        "producer",
        state.tasks.filter((t) => t.projectId === task2.projectId),
      ),
      "review",
    );
    assert.equal(
      (await f.call("/api/action", { action: "retry", id: task2.id })).status,
      200,
    );
  } finally {
    release({ response: "cleanup" });
    await f.mf.dispose();
  }
});
test("voice and natural language validate inputs, output schema and daily quotas", async () => {
  const f = await fixture(async () => ({
    response: JSON.stringify({
      name: "音声案件",
      description: "依頼内容",
      deadline: "",
      template: "video",
    }),
    text: "日本語の依頼です",
  }));
  try {
    await f.call("/api/state");
    const result = await f.call("/api/brief", {
      text: "新しい映像制作案件を作成",
    });
    assert.equal(result.status, 200);
    assert.equal(
      ((await result.json()) as { template: string }).template,
      "video",
    );
    const objectOutput = {
      ...f.env,
      AI: {
        run: async () => ({
          response: {
            name: "オブジェクト出力",
            description: "構造化出力",
            deadline: "",
            template: "web",
          },
        }),
      },
    } as unknown as Env;
    const objectResult = await f.call(
      "/api/brief",
      { text: "Web案件を作成" },
      objectOutput,
    );
    assert.equal(objectResult.status, 200);
    assert.equal(
      ((await objectResult.json()) as { template: string }).template,
      "web",
    );
    assert.equal((await f.call("/api/brief", { text: "" })).status, 400);
    const form = new FormData();
    form.append(
      "audio",
      new File([new Uint8Array(200)], "test.wav", { type: "audio/wav" }),
    );
    let response = await app.request(
      "http://localhost/api/transcribe",
      { method: "POST", headers: { Origin: "http://localhost" }, body: form },
      f.env,
    );
    assert.equal(response.status, 200);
    assert.equal(
      ((await response.json()) as { text: string }).text,
      "日本語の依頼です",
    );
    const invalid = new FormData();
    invalid.append(
      "audio",
      new File([new Uint8Array(200)], "bad.txt", { type: "text/plain" }),
    );
    response = await app.request(
      "http://localhost/api/transcribe",
      {
        method: "POST",
        headers: { Origin: "http://localhost" },
        body: invalid,
      },
      f.env,
    );
    assert.equal(response.status, 400);
    await consumeQuota(f.env.DB, "local-developer", "test", 2);
    await consumeQuota(f.env.DB, "local-developer", "test", 2);
    await assert.rejects(
      () => consumeQuota(f.env.DB, "local-developer", "test", 2),
      /上限/,
    );
    const bad = {
      ...f.env,
      AI: { run: async () => ({ response: '{"name":""}' }) },
    } as unknown as Env;
    assert.equal(
      (await f.call("/api/brief", { text: "不正出力" }, bad)).status,
      400,
    );
    const headers = await f.call("/api/health");
    assert.ok(
      headers.headers
        .get("content-security-policy")
        ?.includes("frame-ancestors 'none'"),
    );
    assert.ok(
      headers.headers.get("permissions-policy")?.includes("microphone=(self)"),
    );
  } finally {
    await f.mf.dispose();
  }
});
