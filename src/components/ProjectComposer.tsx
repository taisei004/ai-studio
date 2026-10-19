import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Project, ProjectDraft } from "../../shared/studio";
import { templates } from "../../shared/studio";
import { structureBrief, transcribe } from "../lib/api";
import { Button, Icon, Modal } from "./ui";
export function ProjectComposer({
  project,
  voice = false,
  onClose,
  onSave,
  saveError = "",
}: {
  project?: Project;
  voice?: boolean;
  onClose: () => void;
  onSave: (draft: ProjectDraft) => Promise<boolean>;
  saveError?: string;
}) {
  const [draft, setDraft] = useState<ProjectDraft>({
    name: project?.name ?? "",
    description: project?.description ?? "",
    deadline: project?.deadline ?? "",
    template: project?.template ?? "program",
  });
  const [mode, setMode] = useState(voice ? "voice" : "form"),
    [text, setText] = useState(""),
    [phase, setPhase] = useState<
      "idle" | "recording" | "transcribing" | "structuring" | "saving"
    >("idle"),
    [error, setError] = useState(""),
    [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    chunks = useRef<Blob[]>([]),
    mounted = useRef(true),
    file = useRef<HTMLInputElement>(null),
    abandon = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abandon.current = true;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(() => {
    if (phase !== "recording") return;
    const timer = setInterval(
      () =>
        setSeconds((s) => {
          if (s >= 59) {
            recorder.current?.stop();
            return 60;
          }
          return s + 1;
        }),
      1000,
    );
    return () => clearInterval(timer);
  }, [phase]);
  async function processAudio(blob: Blob) {
    setPhase("transcribing");
    setError("");
    try {
      const { text } = await transcribe(blob);
      if (mounted.current) {
        setText(text);
        setPhase("idle");
      }
    } catch (e) {
      if (mounted.current) {
        setError((e as Error).message);
        setPhase("idle");
      }
    }
  }
  async function record() {
    setError("");
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw Error(
          "録音を利用できません。音声ファイルを選択するか、テキストで入力してください。",
        );
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (!mounted.current) {
        stream.current.getTracks().forEach((t) => t.stop());
        return;
      }
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
        (t) => MediaRecorder.isTypeSupported(t),
      );
      recorder.current = new MediaRecorder(
        stream.current,
        mime ? { mimeType: mime } : undefined,
      );
      chunks.current = [];
      recorder.current.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      recorder.current.onerror = () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        setError("録音できませんでした。音声ファイル入力をお試しください。");
        setPhase("idle");
      };
      recorder.current.onstop = () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        if (!abandon.current && mounted.current)
          void processAudio(
            new Blob(chunks.current, {
              type: recorder.current?.mimeType ?? "audio/webm",
            }),
          );
      };
      setSeconds(0);
      abandon.current = false;
      recorder.current.start(250);
      setPhase("recording");
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError(
        (e as Error).name === "NotAllowedError"
          ? "マイクが許可されていません。ブラウザーの設定をご確認いただくか、テキスト入力をご利用ください。"
          : (e as Error).message,
      );
      setPhase("idle");
    }
  }
  async function structure() {
    setError("");
    setPhase("structuring");
    try {
      const result = await structureBrief(text);
      if (mounted.current) {
        setDraft(result);
        setMode("form");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (mounted.current) setPhase("idle");
    }
  }
  const busy = !["idle", "recording"].includes(phase);
  return (
    <Modal
      title={project ? "案件を編集" : "新しい案件"}
      subtitle={project ? undefined : "入力方法を選択"}
      onClose={onClose}
    >
      {!project && (
        <div className="segmented composer-tabs">
          <button
            className={mode === "form" ? "selected" : ""}
            disabled={phase !== "idle"}
            onClick={() => setMode("form")}
          >
            <Icon name="edit" size={15} />
            フォーム入力
          </button>
          <button
            className={mode === "voice" ? "selected" : ""}
            disabled={phase !== "idle"}
            onClick={() => setMode("voice")}
          >
            <Icon name="mic" size={15} />
            音声・自然文
          </button>
        </div>
      )}
      {(error || saveError) && (
        <div className="inline-error" role="alert">
          <Icon name="error" size={16} />
          {error || saveError}
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.18 }}
        >
          {mode === "voice" ? (
            <div className="voice-composer">
              <div
                className={`recording-area ${phase === "recording" ? "recording" : ""}`}
              >
                <div className="voice-orb">
                  <Icon
                    name={phase === "recording" ? "wave" : "mic"}
                    size={30}
                  />
                </div>
                {phase === "recording" ? (
                  <>
                    <div className="waveform">
                      {Array.from({ length: 24 }, (_, i) => (
                        <i key={i} style={{ animationDelay: `${i * 0.08}s` }} />
                      ))}
                    </div>
                    <strong>
                      録音中 {seconds.toString().padStart(2, "0")} / 60秒
                    </strong>
                    <Button
                      icon="stop"
                      variant="danger"
                      onClick={() => recorder.current?.stop()}
                    >
                      録音を終了
                    </Button>
                  </>
                ) : (
                  <>
                    <strong>
                      {phase === "transcribing"
                        ? "音声を文字起こし中"
                        : phase === "structuring"
                          ? "案件内容を整理中"
                          : "音声で案件を入力"}
                    </strong>
                    <span>「来週の番組の企画案と台本を作って」</span>
                    <Button
                      icon={busy ? "loading" : "mic"}
                      variant="primary"
                      disabled={busy}
                      onClick={record}
                    >
                      録音を開始
                    </Button>
                  </>
                )}
              </div>
              <input
                ref={file}
                type="file"
                accept="audio/*"
                className="sr-only"
                aria-label="音声ファイル"
                onChange={(e) => {
                  const audio = e.target.files?.[0];
                  if (audio) void processAudio(audio);
                  e.target.value = "";
                }}
              />
              <div className="voice-privacy">
                <span>
                  <Icon name="shield" size={13} />
                  録音は文字起こし時のみCloudflareへ送信。音声は保存しません。
                </span>
                <Button
                  icon="upload"
                  variant="text"
                  disabled={phase !== "idle"}
                  onClick={() => file.current?.click()}
                >
                  音声ファイルを選択
                </Button>
              </div>
              <label>
                依頼内容
                <textarea
                  value={text}
                  maxLength={6000}
                  placeholder="音声の文字起こし、または依頼内容を直接入力"
                  onChange={(e) => setText(e.target.value)}
                  disabled={phase !== "idle"}
                  rows={5}
                />
              </label>
              <div className="dialog-footer">
                <span className="muted">
                  整理後の内容を確認してから登録します。
                </span>
                <Button
                  variant="primary"
                  icon={busy ? "loading" : "arrow"}
                  disabled={phase !== "idle" || !text.trim()}
                  onClick={structure}
                >
                  案件案を作成
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setPhase("saving");
                if (!(await onSave(draft))) setPhase("idle");
              }}
            >
              <label>
                案件名
                <span className="required" aria-hidden="true">
                  必須
                </span>
                <input
                  autoComplete="off"
                  required
                  maxLength={120}
                  value={draft.name}
                  placeholder="案件名を入力"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <div className="form-columns">
                <label>
                  制作テンプレート
                  <select
                    value={draft.template}
                    disabled={!!project}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        template: e.target.value as ProjectDraft["template"],
                      })
                    }
                  >
                    {Object.entries(templates).map(([id, name]) => (
                      <option value={id} key={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  期限
                  <input
                    type="date"
                    value={draft.deadline}
                    onChange={(e) =>
                      setDraft({ ...draft, deadline: e.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                概要・依頼内容
                <textarea
                  rows={6}
                  maxLength={6000}
                  value={draft.description}
                  placeholder="目的、必要な成果物、注意事項"
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </label>
              <div className="dialog-footer">
                <Button onClick={onClose}>キャンセル</Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={busy || !draft.name.trim()}
                  icon={phase === "saving" ? "loading" : "check"}
                >
                  {project ? "変更を保存" : "案件を作成"}
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
}
