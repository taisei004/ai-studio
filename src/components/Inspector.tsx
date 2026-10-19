import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Agent, StudioState, Task, RoomId } from "../../shared/studio";
import {
  currentTask,
  locationFor,
  memberStatus,
  roomNames,
  taskProgress,
} from "../../shared/studio";
import { Badge, Button, Empty, Icon, Modal } from "./ui";
export type Act = (
  action: string,
  input: Record<string, unknown>,
  message?: string,
) => Promise<boolean>;
export function TaskControls({
  task,
  busy,
  act,
  onApprovals,
}: {
  task: Task;
  busy: boolean;
  act: Act;
  onApprovals: () => void;
}) {
  return (
    <div className="task-controls">
      {["idle", "error"].includes(task.status) && (
        <Button
          icon={task.status === "error" ? "retry" : "play"}
          variant="primary"
          disabled={busy}
          onClick={() =>
            act(
              task.status === "error" ? "retry" : "start",
              { id: task.id },
              "作業を開始しました",
            )
          }
        >
          {task.status === "error" ? "再試行" : "作業を開始"}
        </Button>
      )}
      {task.status === "working" && (
        <Button
          icon={task.runId ? "loading" : "send"}
          variant="primary"
          disabled={busy || !!task.runId}
          onClick={() =>
            act("generate", { id: task.id }, "成果物を作成しました")
          }
        >
          {task.runId ? "AI生成中" : "AIで成果物を作成"}
        </Button>
      )}
      {task.status === "review" && (
        <Button icon="approvals" variant="primary" onClick={onApprovals}>
          書類を確認
        </Button>
      )}
      {task.status === "done" && (
        <span className="task-complete">
          <Icon name="checks" size={16} />
          承認済み
        </span>
      )}
    </div>
  );
}
export function Inspector({
  state,
  agent,
  tasks,
  room,
  act,
  busy,
  onApprovals,
  onSelect,
  onEdit,
}: {
  state: StudioState;
  agent: Agent;
  tasks: Task[];
  room: RoomId | null;
  act: Act;
  busy: boolean;
  onApprovals: () => void;
  onSelect: (id: string) => void;
  onEdit: () => void;
}) {
  const [message, setMessage] = useState("");
  const own = tasks.filter((t) => t.agentId === agent.id);
  const task = currentTask(own);
  const location = locationFor(agent.id, own);
  const project = state.projects.find((p) => p.id === task?.projectId);
  const members = room
    ? state.agents.filter(
        (a) =>
          locationFor(
            a.id,
            tasks.filter((t) => t.agentId === a.id),
          ) === room,
      )
    : [];
  return (
    <aside className="inspector glass">
      <AnimatePresence mode="wait">
        <motion.div
          key={room ?? agent.id}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.16 }}
        >
          {room ? (
            <>
              <div className="inspector-top">
                <span>ルーム詳細</span>
                <Icon
                  name={
                    room === "lounge"
                      ? "lounge"
                      : room === "research"
                        ? "research"
                        : room === "computer"
                          ? "computer"
                          : room === "design"
                            ? "design"
                            : room === "review"
                              ? "review"
                              : "meeting"
                  }
                  size={17}
                />
              </div>
              <h2 className="room-inspector-title">{roomNames[room]}</h2>
              <p className="muted">{members.length}人が在室</p>
              <div className="inspector-section">
                <h3>メンバー</h3>
                {members.length ? (
                  members.map((a) => (
                    <button
                      className="room-member-row"
                      key={a.id}
                      onClick={() => onSelect(a.id)}
                    >
                      <span
                        className="avatar small"
                        style={{ background: a.color + "25", color: a.color }}
                      >
                        {a.name.slice(0, 1)}
                      </span>
                      <span>
                        {a.name}
                        <small>{a.role}</small>
                      </span>
                      <Icon name="right" size={14} />
                    </button>
                  ))
                ) : (
                  <Empty title="在室者はいません" icon="agents" />
                )}
              </div>
            </>
          ) : (
            <>
              <div className="inspector-top">
                <span>メンバー詳細</span>
                <Button
                  icon="edit"
                  title="社員プロフィールを編集"
                  variant="icon-button"
                  onClick={onEdit}
                />
              </div>
              <div className="profile-block">
                <div
                  className="avatar large"
                  style={{ background: agent.color + "1f", color: agent.color }}
                >
                  <span>{agent.name.slice(0, 1)}</span>
                  <i style={{ background: agent.color }} />
                </div>
                <div>
                  <h2>{agent.name}</h2>
                  <p>{agent.role}</p>
                </div>
              </div>
              <div className="member-meta">
                <Badge status={memberStatus(own)} />
                <span>
                  <Icon name="office" size={13} />
                  {roomNames[location]}
                </span>
              </div>
              <div className="inspector-section">
                <h3>現在のタスク</h3>
                {task ? (
                  <>
                    <span className="task-project">{project?.name}</span>
                    <h4>{task.title}</h4>
                    <p className="task-specialty">{agent.specialty}</p>
                    <TaskControls
                      task={task}
                      busy={busy}
                      act={act}
                      onApprovals={onApprovals}
                    />
                    {task.status === "error" && (
                      <p className="inline-error small-error">
                        生成に失敗しました。再試行してください。
                      </p>
                    )}
                  </>
                ) : (
                  <p className="no-task">未割り当て</p>
                )}
              </div>
              <div className="inspector-section activity">
                <h3>作業ログ</h3>
                {state.logs
                  .filter((l) => own.some((t) => t.id === l.taskId))
                  .slice(0, 4)
                  .map((l) => (
                    <div className="activity-item" key={l.id}>
                      <i />
                      <div>
                        <p>{l.message}</p>
                        <time>
                          {new Date(l.createdAt).toLocaleTimeString("ja-JP", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                    </div>
                  ))}
                {!state.logs.some((l) =>
                  own.some((t) => t.id === l.taskId),
                ) && <p className="no-task">作業記録はありません</p>}
              </div>
              {task && (
                <form
                  className="direction-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                      await act(
                        "message",
                        { id: task.id, message },
                        "指示を保存しました",
                      )
                    )
                      setMessage("");
                  }}
                >
                  <label htmlFor="direction">追加の指示</label>
                  <div className="direction-input">
                    <input
                      id="direction"
                      maxLength={4000}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="指示を入力"
                    />
                    <Button
                      type="submit"
                      icon="send"
                      title="指示を送信"
                      variant="icon-button"
                      disabled={busy || !message.trim()}
                    />
                  </div>
                </form>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}
export function Workflow({
  tasks,
  onSelect,
  onSelectTask,
}: {
  tasks: Task[];
  onSelect?: (id: string) => void;
  onSelectTask?: (id: string) => void;
}) {
  return (
    <section className="workflow-panel">
      <div className="section-title">
        <h2>制作フロー</h2>
        <span>
          {tasks.filter((t) => t.status === "done").length} / {tasks.length}{" "}
          完了
        </span>
      </div>
      <div className="workflow-steps">
        {tasks.map((t, i) => (
          <button
            key={t.id}
            className={`flow-step ${t.status}`}
            onClick={() =>
              onSelectTask ? onSelectTask(t.id) : onSelect?.(t.agentId)
            }
          >
            <span className="step-symbol">
              {t.status === "done" ? (
                <Icon name="check" size={13} />
              ) : t.runId ? (
                <Icon name="loading" size={13} className="spin" />
              ) : (
                String(i + 1).padStart(2, "0")
              )}
            </span>
            <strong>{t.title}</strong>
            <span className="step-line" />
          </button>
        ))}
      </div>
      <div className="workflow-progress">
        <motion.i
          animate={{ width: `${taskProgress(tasks)}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 25 }}
        />
      </div>
    </section>
  );
}
export function AgentEditor({
  agent,
  onClose,
  onSave,
}: {
  agent: Agent;
  onClose: () => void;
  onSave: (agent: Agent) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(agent),
    [saving, setSaving] = useState(false);
  return (
    <Modal title="社員プロフィール" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          if (!(await onSave(draft))) setSaving(false);
        }}
      >
        {(
          [
            ["name", "名前"],
            ["role", "役割"],
            ["specialty", "得意分野"],
            ["instructions", "カスタム指示"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            {key === "instructions" ? (
              <textarea
                rows={5}
                maxLength={4000}
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            ) : (
              <input
                required
                maxLength={key === "specialty" ? 1000 : 100}
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            )}
          </label>
        ))}
        <div className="dialog-footer">
          <Button onClick={onClose}>キャンセル</Button>
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            icon={saving ? "loading" : "check"}
          >
            保存
          </Button>
        </div>
      </form>
    </Modal>
  );
}
