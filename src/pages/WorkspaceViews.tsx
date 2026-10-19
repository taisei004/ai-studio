import { useState } from "react";
import type {
  StudioState,
  Project,
  Agent,
  Artifact,
} from "../../shared/studio";
import {
  templates,
  taskProgress,
  memberStatus,
  locationFor,
  roomNames,
} from "../../shared/studio";
import {
  Badge,
  Button,
  Empty,
  Icon,
  Modal,
  downloadFile,
} from "../components/ui";
import { TaskControls, Workflow, type Act } from "../components/Inspector";
export function ProjectsView({
  state,
  selected,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  act,
  busy,
  onApprovals,
}: {
  state: StudioState;
  selected?: Project;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit: () => void;
  onDelete: () => void;
  act: Act;
  busy: boolean;
  onApprovals: () => void;
}) {
  const [filter, setFilter] = useState("");
  const projects = state.projects.filter((p) =>
    (p.name + p.description).toLowerCase().includes(filter.toLowerCase()),
  );
  const tasks = state.tasks.filter((t) => t.projectId === selected?.id);
  if (!state.projects.length)
    return (
      <Empty
        title="案件はありません"
        action={
          <Button icon="plus" variant="primary" onClick={onCreate}>
            案件を作成
          </Button>
        }
      />
    );
  return (
    <div className="projects-layout">
      <section className="project-list surface">
        <div className="list-search">
          <Icon name="search" size={16} />
          <input
            aria-label="案件を絞り込み"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="案件を検索"
          />
        </div>
        {projects.map((p) => {
          const tasks = state.tasks.filter((t) => t.projectId === p.id);
          return (
            <button
              className={`project-list-item ${p.id === selected?.id ? "selected" : ""}`}
              key={p.id}
              onClick={() => onSelect(p.id)}
            >
              <div className="project-type-icon">
                <Icon
                  name={
                    p.template === "web"
                      ? "computer"
                      : p.template === "video"
                        ? "meeting"
                        : "projects"
                  }
                  size={18}
                />
              </div>
              <div>
                <strong>{p.name}</strong>
                <span>
                  {templates[p.template]} <i /> {p.deadline || "期限なし"}
                </span>
                <div className="mini-progress">
                  <i style={{ width: `${taskProgress(tasks)}%` }} />
                </div>
              </div>
              <span>{taskProgress(tasks)}%</span>
            </button>
          );
        })}
        {!projects.length && (
          <p className="search-empty">該当する案件はありません</p>
        )}
      </section>
      {selected && (
        <section className="project-detail surface">
          <div className="section-title">
            <Badge>{templates[selected.template]}</Badge>
            <div className="button-group">
              <Button
                icon="edit"
                variant="icon-button"
                title="案件を編集"
                onClick={onEdit}
              />
              <Button
                icon="delete"
                variant="icon-button"
                title="案件を削除"
                onClick={onDelete}
              />
            </div>
          </div>
          <h2>{selected.name}</h2>
          <p className="project-description">
            {selected.description || "概要未設定"}
          </p>
          <div className="project-metadata">
            <span>
              <Icon name="calendar" size={14} />
              {selected.deadline || "期限未設定"}
            </span>
            <span>
              <Icon name="agents" size={14} />
              6人
            </span>
            <span>
              <Icon name="checks" size={14} />
              {taskProgress(tasks)}% 完了
            </span>
          </div>
          <Workflow
            tasks={tasks}
            onSelectTask={(id) =>
              document
                .getElementById("task-" + id)
                ?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
          />
          <div className="task-list">
            {tasks.map((t) => (
              <div className="task-list-row" id={"task-" + t.id} key={t.id}>
                <span className={`task-number ${t.status}`}>
                  {t.status === "done" ? (
                    <Icon name="check" size={14} />
                  ) : (
                    String(t.order + 1).padStart(2, "0")
                  )}
                </span>
                <div>
                  <strong>{t.title}</strong>
                  <small>
                    {state.agents.find((a) => a.id === t.agentId)?.name}
                  </small>
                </div>
                <Badge status={t.status} />
                <TaskControls
                  task={t}
                  busy={busy}
                  act={act}
                  onApprovals={onApprovals}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
export function AgentsView({
  state,
  onEdit,
}: {
  state: StudioState;
  onEdit: (agent: Agent) => void;
}) {
  return (
    <div className="agents-grid">
      {state.agents.map((a) => {
        const tasks = state.tasks.filter((t) => t.agentId === a.id);
        return (
          <article key={a.id} className="agent-card surface">
            <div className="section-title">
              <div
                className="avatar large"
                style={{ background: a.color + "20", color: a.color }}
              >
                {a.name.slice(0, 1)}
              </div>
              <Button
                icon="edit"
                title={`${a.name}を編集`}
                variant="icon-button"
                onClick={() => onEdit(a)}
              />
            </div>
            <h2>{a.name}</h2>
            <p>{a.role}</p>
            <div className="agent-card-status">
              <Badge status={memberStatus(tasks)} />
              <span>
                <Icon name="office" size={13} />
                {roomNames[locationFor(a.id, tasks)]}
              </span>
            </div>
            <p className="agent-specialty">{a.specialty}</p>
            <div className="agent-card-footer">
              <span>担当 {tasks.length}件</span>
              <span>
                完了 {tasks.filter((t) => t.status === "done").length}件
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
export function ApprovalsView({
  state,
  act,
  busy,
}: {
  state: StudioState;
  act: Act;
  busy: boolean;
}) {
  const [filter, setFilter] = useState<"pending" | "history">("pending"),
    [selected, setSelected] = useState(""),
    [comment, setComment] = useState("");
  const items = state.approvals.filter((a) =>
    filter === "pending"
      ? ["pending", "held"].includes(a.status)
      : ["approved", "revision"].includes(a.status),
  );
  const approval = items.find((a) => a.id === selected) ?? items[0];
  const artifact = state.artifacts.find((f) => f.id === approval?.artifactId);
  const task = state.tasks.find((t) => t.id === approval?.taskId);
  return (
    <>
      <div className="page-subnav segmented">
        <button
          className={filter === "pending" ? "selected" : ""}
          onClick={() => {
            setFilter("pending");
            setSelected("");
            setComment("");
          }}
        >
          承認待ち{" "}
          <span>
            {
              state.approvals.filter((a) =>
                ["pending", "held"].includes(a.status),
              ).length
            }
          </span>
        </button>
        <button
          className={filter === "history" ? "selected" : ""}
          onClick={() => {
            setFilter("history");
            setSelected("");
            setComment("");
          }}
        >
          処理済み
        </button>
      </div>
      {!items.length ? (
        <Empty
          icon="approvals"
          title={
            filter === "pending"
              ? "承認待ちの書類はありません"
              : "処理済みの書類はありません"
          }
        />
      ) : (
        <div className="approval-layout">
          <div className="approval-list surface">
            {items.map((a) => {
              const t = state.tasks.find((t) => t.id === a.taskId);
              return (
                <button
                  className={`approval-item ${approval?.id === a.id ? "selected" : ""}`}
                  key={a.id}
                  onClick={() => {
                    setSelected(a.id);
                    setComment("");
                  }}
                >
                  <Icon name="file" size={22} />
                  <div>
                    <strong>{t?.title}</strong>
                    <small>
                      {state.projects.find((p) => p.id === t?.projectId)?.name}
                    </small>
                  </div>
                  <span
                    className={`badge ${a.status === "held" ? "review" : ""}`}
                  >
                    {a.status === "held"
                      ? "保留"
                      : a.status === "approved"
                        ? "承認済"
                        : a.status === "revision"
                          ? "修正依頼"
                          : "未確認"}
                  </span>
                </button>
              );
            })}
          </div>
          {approval && (
            <article className="document surface">
              <div className="document-header">
                <div>
                  <span className="muted">
                    {state.projects.find((p) => p.id === task?.projectId)?.name}{" "}
                    / {state.agents.find((a) => a.id === task?.agentId)?.name}
                  </span>
                  <h2>{task?.title}</h2>
                </div>
                {artifact && (
                  <Button
                    icon="download"
                    variant="icon-button"
                    title="成果物を保存"
                    onClick={() =>
                      downloadFile(artifact.title + ".md", artifact.content)
                    }
                  />
                )}
              </div>
              <pre className="document-body">
                {artifact?.content ?? "成果物が見つかりません"}
              </pre>
              {filter === "pending" ? (
                <div className="approval-actions">
                  <label>
                    修正内容・コメント
                    <textarea
                      maxLength={4000}
                      placeholder="修正依頼の場合は必須"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                    />
                  </label>
                  <div className="button-group">
                    <Button
                      icon="check"
                      variant="primary"
                      disabled={busy}
                      onClick={async () => {
                        if (
                          await act(
                            "approve",
                            { id: approval.id, comment },
                            "承認しました",
                          )
                        )
                          setComment("");
                      }}
                    >
                      承認
                    </Button>
                    <Button
                      icon="retry"
                      disabled={busy}
                      onClick={async () => {
                        if (
                          await act(
                            "revise",
                            { id: approval.id, comment },
                            "修正を依頼しました",
                          )
                        )
                          setComment("");
                      }}
                    >
                      修正依頼
                    </Button>
                    <Button
                      icon="pause"
                      disabled={busy}
                      onClick={() =>
                        act(
                          "hold",
                          { id: approval.id, comment },
                          "保留しました",
                        )
                      }
                    >
                      保留
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="approval-actions">
                  <p>{approval.comment || "コメントなし"}</p>
                </div>
              )}
            </article>
          )}
        </div>
      )}
    </>
  );
}
export function ArtifactsView({
  state,
  onOpen,
}: {
  state: StudioState;
  onOpen: (f: Artifact) => void;
}) {
  const [search, setSearch] = useState("");
  const items = state.artifacts.filter((f) =>
    (f.title + f.content).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="surface artifact-library">
      <div className="section-title">
        <span>{state.artifacts.length} 件の成果物</span>
        <div className="list-search">
          <Icon name="search" size={15} />
          <input
            aria-label="成果物を検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="成果物を検索"
          />
        </div>
      </div>
      {items.length ? (
        <table>
          <thead>
            <tr>
              <th>ファイル名</th>
              <th>案件</th>
              <th>作成日時</th>
              <th>
                <span className="sr-only">操作</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((f) => (
              <tr key={f.id}>
                <td>
                  <button className="file-link" onClick={() => onOpen(f)}>
                    <span className="file-icon">
                      <Icon name="file" size={20} />
                    </span>
                    {f.title}
                    <span className="extension">MD</span>
                  </button>
                </td>
                <td>
                  {
                    state.projects.find(
                      (p) =>
                        p.id ===
                        state.tasks.find((t) => t.id === f.taskId)?.projectId,
                    )?.name
                  }
                </td>
                <td>
                  {new Date(f.createdAt).toLocaleString("ja-JP", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td>
                  <Button
                    icon="download"
                    title={`${f.title}を保存`}
                    variant="icon-button"
                    onClick={() => downloadFile(f.title + ".md", f.content)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Empty
          icon="artifacts"
          title={search ? "該当する成果物はありません" : "成果物はありません"}
        />
      )}
    </section>
  );
}
export function SettingsView({
  state,
  motionOff,
  onMotionChange,
  onLogout,
}: {
  state: StudioState;
  motionOff: boolean;
  onMotionChange: (value: boolean) => void;
  onLogout: () => void;
}) {
  return (
    <div className="settings-layout">
      <section className="surface settings-section">
        <h2>表示と操作</h2>
        <div className="setting-row">
          <div>
            <strong>アニメーションを減らす</strong>
            <p>OSの設定は常に優先されます</p>
          </div>
          <button
            role="switch"
            aria-label="アニメーションを減らす"
            aria-checked={motionOff}
            className={`switch ${motionOff ? "on" : ""}`}
            onClick={() => onMotionChange(!motionOff)}
          >
            <i />
          </button>
        </div>
        <div className="setting-row">
          <div>
            <strong>表示テーマ</strong>
            <p>ライト / Liquid Glass</p>
          </div>
          <Icon name="sun" size={20} />
        </div>
      </section>
      <section className="surface settings-section">
        <h2>接続</h2>
        <div className="setting-row">
          <div>
            <strong>Cloudflare Workers</strong>
            <p>API / 静的ファイル</p>
          </div>
          <Badge>
            {state.mode === "development" ? "ローカル開発" : "接続済み"}
          </Badge>
        </div>
        <div className="setting-row">
          <div>
            <strong>D1</strong>
            <p>ユーザー別データ保存</p>
          </div>
          <Badge>接続済み</Badge>
        </div>
        <div className="setting-row">
          <div>
            <strong>Workers AI</strong>
            <p>Llama 3.3 / Whisper large v3 turbo</p>
          </div>
          <Badge>{state.aiAvailable ? "利用可能" : "設定が必要"}</Badge>
        </div>
      </section>
      <section className="surface settings-section">
        <h2>アカウント</h2>
        <div className="setting-row">
          <div>
            <strong>{state.user.name}</strong>
            <p>{state.user.email}</p>
          </div>
          <Badge>
            {state.mode === "development" ? "開発セッション" : "Google"}
          </Badge>
        </div>
        {state.mode !== "development" && (
          <Button icon="logout" onClick={onLogout}>
            ログアウト
          </Button>
        )}
      </section>
      <section className="surface settings-section">
        <h2>データ</h2>
        <div className="setting-row">
          <div>
            <strong>バックアップ</strong>
            <p>案件・タスク・成果物をJSONで保存</p>
          </div>
          <Button
            icon="download"
            onClick={() =>
              downloadFile(
                "ai-studio-backup.json",
                JSON.stringify(state, null, 2),
                "application/json",
              )
            }
          >
            書き出す
          </Button>
        </div>
        <p className="muted">
          音声データはサーバーに保存しません。AI生成は1日50回、音声入力と案件整理はそれぞれ30回までです。
        </p>
      </section>
      <p className="version-note">AI STUDIO 0.2.0</p>
    </div>
  );
}
export function ArtifactViewer({
  artifact,
  onClose,
}: {
  artifact: Artifact;
  onClose: () => void;
}) {
  return (
    <Modal title={artifact.title} wide onClose={onClose}>
      <pre className="document-body standalone">{artifact.content}</pre>
      <div className="dialog-footer">
        <Button
          icon="download"
          variant="primary"
          onClick={() => downloadFile(artifact.title + ".md", artifact.content)}
        >
          Markdownを保存
        </Button>
      </div>
    </Modal>
  );
}
