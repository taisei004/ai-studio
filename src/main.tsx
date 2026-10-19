import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type {
  Agent,
  Artifact,
  Project,
  ProjectDraft,
  RoomId,
  StudioState,
} from "../shared/studio";
import { initialAgents, memberStatus, taskProgress } from "../shared/studio";
import { ApiError, getSession, getState, request, sendAction } from "./lib/api";
import {
  Badge,
  Button,
  Empty,
  Icon,
  Modal,
  Skeleton,
  Toast,
  type IconName,
} from "./components/ui";
import { AgentEditor, Inspector, Workflow } from "./components/Inspector";
import { ProjectComposer } from "./components/ProjectComposer";
import { Office } from "./office/Office";
import {
  AgentsView,
  ApprovalsView,
  ArtifactViewer,
  ArtifactsView,
  ProjectsView,
  SettingsView,
} from "./pages/WorkspaceViews";
import "./styles.css";
import "./accessibility.css";
type View =
  | "office"
  | "projects"
  | "agents"
  | "approvals"
  | "artifacts"
  | "settings";
const navigation: { id: View; label: string; icon: IconName }[] = [
  { id: "office", label: "オフィス", icon: "office" },
  { id: "projects", label: "案件", icon: "projects" },
  { id: "agents", label: "AIメンバー", icon: "agents" },
  { id: "approvals", label: "承認ボックス", icon: "approvals" },
  { id: "artifacts", label: "成果物", icon: "artifacts" },
  { id: "settings", label: "設定", icon: "settings" },
];
function App() {
  const [state, setState] = useState<StudioState | null>(null),
    [session, setSession] = useState<Awaited<
      ReturnType<typeof getSession>
    > | null>(null),
    [loading, setLoading] = useState(true),
    [refreshing, setRefreshing] = useState(false),
    [view, setView] = useState<View>("office"),
    [projectId, setProjectId] = useState(""),
    [agentId, setAgentId] = useState("researcher"),
    [room, setRoom] = useState<RoomId | null>(null),
    [composer, setComposer] = useState<{
      project?: Project;
      voice?: boolean;
    } | null>(null),
    [editing, setEditing] = useState<Agent | null>(null),
    [deleting, setDeleting] = useState(false),
    [artifact, setArtifact] = useState<Artifact | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [motionOff, setMotionOff] = useState(
      () => localStorage.getItem("studio-reduce-motion") === "true",
    ),
    [wide, setWide] = useState(false);
  const clearNotice = useCallback(() => setNotice(""), []),
    clearError = useCallback(() => setError(""), []);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const session = await getSession();
      setSession(session);
      if (session.user) setState(await getState());
      else setState(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(motionOff);
  }, [motionOff]);
  useEffect(() => {
    if (!state) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !busy)
        void getState()
          .then(setState)
          .catch((e) => {
            if (e instanceof ApiError && e.status === 401) {
              setState(null);
              void getSession().then(setSession);
            }
          });
    }, 5000);
    return () => clearInterval(timer);
  }, [!!state, busy]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
      if (e.key === "Escape") setQuery("");
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  const act = useCallback(
    async (
      action: string,
      input: Record<string, unknown>,
      message = "保存しました",
    ) => {
      setBusy(true);
      setError("");
      if (action === "generate")
        setState((s) =>
          s
            ? {
                ...s,
                tasks: s.tasks.map((t) =>
                  t.id === input.id ? { ...t, runId: "request-pending" } : t,
                ),
              }
            : s,
        );
      try {
        const result = await sendAction(action, input);
        setState(result.state);
        if (result.projectId) setProjectId(result.projectId);
        setNotice(message);
        return true;
      } catch (e) {
        setError((e as Error).message);
        if (e instanceof ApiError && e.status === 401) void load();
        else
          void getState()
            .then(setState)
            .catch(() => {});
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );
  async function refresh() {
    setRefreshing(true);
    try {
      setState(await getState());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }
  function selectAgent(id: string) {
    setAgentId(id);
    setRoom(null);
  }
  function navigate(id: View) {
    setView(id);
    setQuery("");
  }
  async function logout() {
    try {
      await request("/auth/logout", {});
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (loading)
    return (
      <MotionConfig reducedMotion="user">
        <Skeleton />
      </MotionConfig>
    );
  if (!state)
    return (
      <div className="login-shell">
        <div className="login-glow" />
        <section className="login-panel glass">
          <div className="app-mark">
            <Icon name="office" size={27} />
          </div>
          <h1>AI STUDIO</h1>
          <h2>ログイン</h2>
          <a
            className={`google-login ${session?.googleConfigured ? "" : "unconfigured"}`}
            href="/auth/google"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.7 3.2-8"
                fill="#4285F4"
              />
              <path
                d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.4-2-6.3-4.6H2v2.8A11 11 0 0 0 12 23"
                fill="#34A853"
              />
              <path
                d="M5.7 14a7 7 0 0 1 0-4V7.2H2a11 11 0 0 0 0 9.6z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1A10.5 10.5 0 0 0 12 1 11 11 0 0 0 2 7.2L5.7 10C6.6 7.4 9.1 5.4 12 5.4"
                fill="#EA4335"
              />
            </svg>
            Googleでログイン
          </a>
          {!session?.googleConfigured && (
            <p className="login-configuration">
              Google認証の設定を準備中です。
            </p>
          )}
          {new URLSearchParams(location.search).has("authError") && (
            <p className="inline-error" role="alert">
              ログインできませんでした。設定と利用可能なアカウントをご確認ください。
            </p>
          )}
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <Button icon="retry" variant="text" onClick={load}>
            再読み込み
          </Button>
        </section>
        <span className="login-footer">
          <Icon name="shield" size={13} />
          Googleアカウントで認証
        </span>
      </div>
    );
  const project =
    state.projects.find((p) => p.id === projectId) ?? state.projects[0];
  const tasks = state.tasks.filter((t) => t.projectId === project?.id);
  const selected =
    state.agents.find((a) => a.id === agentId) ??
    state.agents[0] ??
    initialAgents[1];
  const pending = state.approvals.filter((a) =>
    ["pending", "held"].includes(a.status),
  );
  const title = navigation.find((n) => n.id === view)!.label;
  const matchingProjects = query.trim()
    ? state.projects
        .filter((p) =>
          (p.name + p.description).toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 5)
    : [];
  const matchingArtifacts = query.trim()
    ? state.artifacts
        .filter((f) => f.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
    : [];
  return (
    <MotionConfig reducedMotion={motionOff ? "always" : "user"}>
      <div className={`app-shell ${wide ? "wide-office" : ""}`}>
        <div className="ambient-light" />
        <aside className="sidebar glass">
          <button className="brand" onClick={() => navigate("office")}>
            <span className="app-mark">
              <Icon name="office" size={20} />
            </span>
            <span>AI STUDIO</span>
          </button>
          <div className="workspace-switch">
            <span className="workspace-avatar">S</span>
            <div>
              <strong>マイワークスペース</strong>
              <span>Personal workspace</span>
            </div>
          </div>
          <span className="sidebar-label">ワークスペース</span>
          <nav>
            {navigation
              .filter((n) => n.id !== "settings")
              .map((n) => (
                <button
                  key={n.id}
                  onClick={() => navigate(n.id)}
                  className={view === n.id ? "active" : ""}
                  aria-current={view === n.id ? "page" : undefined}
                >
                  {view === n.id && (
                    <motion.i
                      layoutId="nav-pill"
                      className="nav-pill"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 34,
                      }}
                    />
                  )}
                  <Icon name={n.icon} size={19} />
                  <span>{n.label}</span>
                  {n.id === "approvals" && pending.length > 0 && (
                    <b>{pending.length}</b>
                  )}
                </button>
              ))}
          </nav>
          <div className="sidebar-projects">
            <div className="section-title">
              <span>案件</span>
              <Button
                icon="plus"
                title="案件を追加"
                variant="icon-button"
                onClick={() => setComposer({})}
              />
            </div>
            {state.projects.slice(0, 5).map((p, i) => (
              <button
                key={p.id}
                className={p.id === project?.id ? "selected" : ""}
                onClick={() => {
                  setProjectId(p.id);
                  navigate("projects");
                }}
              >
                <i
                  style={{
                    background: ["#8498c6", "#b597c8", "#8eb9b1", "#c8ad81"][
                      i % 4
                    ],
                  }}
                />
                <span>{p.name}</span>
              </button>
            ))}
            {!state.projects.length && (
              <span className="sidebar-no-projects">未登録</span>
            )}
          </div>
          <div className="sidebar-bottom">
            <span className="connection">
              <Icon name="cloud" size={14} />
              {state.mode === "development" ? "ローカル開発" : "Cloudflare"}
              <i />
            </span>
            <button
              onClick={() => navigate("settings")}
              className={view === "settings" ? "active" : ""}
            >
              <Icon name="settings" size={19} />
              <span>設定</span>
            </button>
            <div className="account">
              <span className="avatar user-avatar">
                {state.user.name.slice(0, 1)}
              </span>
              <div>
                <strong>{state.user.name}</strong>
                <span>
                  {state.mode === "development"
                    ? "開発セッション"
                    : "Googleアカウント"}
                </span>
              </div>
              {state.mode !== "development" && (
                <Button
                  icon="logout"
                  title="ログアウト"
                  variant="icon-button"
                  onClick={() => void logout()}
                />
              )}
            </div>
          </div>
        </aside>
        <div className="workspace-main">
          <header className="topbar">
            <div className="breadcrumb">
              <span>ワークスペース</span>
              <Icon name="right" size={13} />
              <strong>{title}</strong>
            </div>
            <div className="topbar-right">
              <div className="global-search">
                <Icon name="search" size={16} />
                <input
                  id="global-search"
                  aria-label="ワークスペースを検索"
                  placeholder="検索"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <kbd>Ctrl K</kbd>
                {query && (
                  <div
                    className="search-results glass"
                    role="region"
                    aria-label="検索結果"
                  >
                    {matchingProjects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setProjectId(p.id);
                          navigate("projects");
                        }}
                      >
                        <Icon name="projects" size={16} />
                        {p.name}
                      </button>
                    ))}
                    {matchingArtifacts.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setArtifact(f);
                          setQuery("");
                        }}
                      >
                        <Icon name="file" size={16} />
                        {f.title}
                      </button>
                    ))}
                    {!matchingProjects.length && !matchingArtifacts.length && (
                      <p>一致する結果はありません</p>
                    )}
                  </div>
                )}
              </div>
              <Button
                icon={refreshing ? "loading" : "retry"}
                title="データを更新"
                variant="icon-button"
                disabled={refreshing}
                onClick={() => void refresh()}
              />
              <button
                className="notification-button"
                aria-label="承認通知"
                onClick={() => navigate("approvals")}
              >
                <Icon name="approvals" size={19} />
                {pending.length > 0 && <i />}
              </button>
            </div>
          </header>
          <main>
            <div className="page-heading">
              <div>
                <div className="page-context">ワークスペース</div>
                <h1>{title}</h1>
              </div>
              <div className="button-group">
                <Button
                  icon="mic"
                  variant="glass"
                  onClick={() => setComposer({ voice: true })}
                >
                  音声で依頼
                </Button>
                <Button
                  icon="plus"
                  variant="primary"
                  onClick={() => setComposer({})}
                >
                  新しい案件
                </Button>
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="page-content"
              >
                {view === "office" && (
                  <>
                    <div className="office-overview">
                      <div>
                        <span className="stat-icon lavender">
                          <Icon name="projects" size={19} />
                        </span>
                        <span>
                          <small>進行中の案件</small>
                          <strong>
                            {
                              state.projects.filter(
                                (p) =>
                                  taskProgress(
                                    state.tasks.filter(
                                      (t) => t.projectId === p.id,
                                    ),
                                  ) < 100,
                              ).length
                            }
                            <em>件</em>
                          </strong>
                        </span>
                      </div>
                      <div>
                        <span className="stat-icon teal">
                          <Icon name="agents" size={19} />
                        </span>
                        <span>
                          <small>作業中のメンバー</small>
                          <strong>
                            {
                              state.agents.filter(
                                (a) =>
                                  memberStatus(
                                    state.tasks.filter(
                                      (t) => t.agentId === a.id,
                                    ),
                                  ) === "working",
                              ).length
                            }
                            <em>/ {state.agents.length}人</em>
                          </strong>
                        </span>
                        <span className="live-label">
                          <i />
                          稼働状況
                        </span>
                      </div>
                      <button onClick={() => navigate("approvals")}>
                        <span className="stat-icon peach">
                          <Icon name="approvals" size={19} />
                        </span>
                        <span>
                          <small>承認待ち</small>
                          <strong>
                            {pending.length}
                            <em>件</em>
                          </strong>
                        </span>
                        <Icon name="upRight" size={16} />
                      </button>
                    </div>
                    <div className="office-section-title">
                      <div className="button-group">
                        <h2>スタジオ</h2>
                        <span className="floor-badge">1F</span>
                      </div>
                      <div className="button-group">
                        <div className="project-select">
                          <Icon name="projects" size={14} />
                          <select
                            aria-label="表示する案件"
                            value={project?.id ?? ""}
                            onChange={(e) => setProjectId(e.target.value)}
                          >
                            {!state.projects.length && (
                              <option value="">案件未登録</option>
                            )}
                            {state.projects.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <Button
                          icon={wide ? "minimize" : "maximize"}
                          title={wide ? "詳細パネルを表示" : "オフィスを拡大"}
                          variant="icon-button"
                          onClick={() => setWide(!wide)}
                        />
                      </div>
                    </div>
                    <div className="office-layout">
                      <Office
                        agents={state.agents}
                        tasks={tasks}
                        selected={room ? "" : selected.id}
                        onSelect={selectAgent}
                        onRoomSelect={setRoom}
                      />
                      {!wide && (
                        <Inspector
                          state={state}
                          agent={selected}
                          tasks={tasks}
                          room={room}
                          act={act}
                          busy={busy}
                          onApprovals={() => navigate("approvals")}
                          onSelect={selectAgent}
                          onEdit={() => setEditing(selected)}
                        />
                      )}
                    </div>
                    {project ? (
                      <Workflow tasks={tasks} onSelect={selectAgent} />
                    ) : (
                      <div className="first-project surface">
                        <Icon name="projects" size={20} />
                        <span>
                          案件を登録すると、メンバーに工程が割り当てられます。
                        </span>
                        <Button icon="plus" onClick={() => setComposer({})}>
                          案件を作成
                        </Button>
                      </div>
                    )}
                    <section className="recent-section">
                      <div className="section-title">
                        <h2>最近の更新</h2>
                        <Button
                          variant="text"
                          icon="right"
                          onClick={() => navigate("artifacts")}
                        >
                          成果物を表示
                        </Button>
                      </div>
                      {state.logs.length ? (
                        <div className="recent-updates">
                          {state.logs.slice(0, 3).map((l) => (
                            <div key={l.id}>
                              <span className="recent-icon">
                                <Icon name="clock" size={14} />
                              </span>
                              <p>
                                {l.message}
                                <small>
                                  {
                                    state.tasks.find((t) => t.id === l.taskId)
                                      ?.title
                                  }
                                </small>
                              </p>
                              <time>
                                {new Date(l.createdAt).toLocaleTimeString(
                                  "ja-JP",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </time>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="quiet-empty">更新はありません</div>
                      )}
                    </section>
                  </>
                )}
                {view === "projects" && (
                  <ProjectsView
                    state={state}
                    selected={project}
                    onSelect={setProjectId}
                    onCreate={() => setComposer({})}
                    onEdit={() => setComposer({ project })}
                    onDelete={() => setDeleting(true)}
                    act={act}
                    busy={busy}
                    onApprovals={() => navigate("approvals")}
                  />
                )}
                {view === "agents" && (
                  <AgentsView state={state} onEdit={setEditing} />
                )}
                {view === "approvals" && (
                  <ApprovalsView state={state} act={act} busy={busy} />
                )}
                {view === "artifacts" && (
                  <ArtifactsView state={state} onOpen={setArtifact} />
                )}
                {view === "settings" && (
                  <SettingsView
                    state={state}
                    motionOff={motionOff}
                    onMotionChange={(value) => {
                      setMotionOff(value);
                      localStorage.setItem(
                        "studio-reduce-motion",
                        String(value),
                      );
                    }}
                    onLogout={() => void logout()}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
          <footer className="app-footer">
            <span>
              <i />
              {busy
                ? "処理中"
                : error
                  ? "接続を確認してください"
                  : "すべての変更を保存済み"}
            </span>
            <span>
              AI STUDIO <span>0.2</span>
            </span>
          </footer>
        </div>
        {composer && (
          <ProjectComposer
            saveError={error}
            project={composer.project}
            voice={composer.voice}
            onClose={() => setComposer(null)}
            onSave={async (draft) => {
              const ok = await act(
                composer.project ? "editProject" : "createProject",
                {
                  ...draft,
                  ...(composer.project ? { id: composer.project.id } : {}),
                },
                composer.project ? "案件を更新しました" : "案件を作成しました",
              );
              if (ok) setComposer(null);
              return ok;
            }}
          />
        )}
        {editing && (
          <AgentEditor
            agent={editing}
            onClose={() => setEditing(null)}
            onSave={async (agent) => {
              const ok = await act("editAgent", { ...agent });
              if (ok) setEditing(null);
              return ok;
            }}
          />
        )}
        {deleting && project && (
          <Modal title="案件を削除" onClose={() => setDeleting(false)}>
            <p className="delete-explanation">
              「{project.name}
              」と関連するタスク・書類・成果物・ログを削除します。
            </p>
            <div className="dialog-footer">
              <Button onClick={() => setDeleting(false)}>キャンセル</Button>
              <Button
                icon="delete"
                variant="danger"
                disabled={busy}
                onClick={async () => {
                  if (
                    await act(
                      "deleteProject",
                      { id: project.id },
                      "案件を削除しました",
                    )
                  )
                    setDeleting(false);
                }}
              >
                削除する
              </Button>
            </div>
          </Modal>
        )}
        {artifact && (
          <ArtifactViewer
            artifact={artifact}
            onClose={() => setArtifact(null)}
          />
        )}
        {notice && <Toast message={notice} onClose={clearNotice} />}
        {error && <Toast message={error} onClose={clearError} error />}
      </div>
    </MotionConfig>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
