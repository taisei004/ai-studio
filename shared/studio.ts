export type TaskStatus = "idle" | "working" | "review" | "done" | "error";
export type RoomId =
  | "meeting"
  | "research"
  | "computer"
  | "design"
  | "review"
  | "lounge";
export type Template = "program" | "web" | "video" | "custom";
export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}
export interface Agent {
  id: string;
  name: string;
  role: string;
  specialty: string;
  instructions: string;
  color: string;
}
export interface Project {
  id: string;
  name: string;
  description: string;
  deadline: string;
  template: Template;
  createdAt: string;
}
export interface Task {
  id: string;
  projectId: string;
  agentId: string;
  title: string;
  status: TaskStatus;
  order: number;
  runId: string | null;
  revision: string;
}
export interface Approval {
  id: string;
  taskId: string;
  artifactId: string;
  status: "pending" | "held" | "approved" | "revision";
  comment: string;
}
export interface Artifact {
  id: string;
  taskId: string;
  title: string;
  content: string;
  createdAt: string;
}
export interface Log {
  id: string;
  taskId: string;
  message: string;
  createdAt: string;
}
export interface StudioState {
  user: User;
  agents: Agent[];
  projects: Project[];
  tasks: Task[];
  approvals: Approval[];
  artifacts: Artifact[];
  logs: Log[];
  mode: "cloud" | "development";
  aiAvailable: boolean;
}
export interface ProjectDraft {
  name: string;
  description: string;
  deadline: string;
  template: Template;
}
export const statusNames: Record<TaskStatus, string> = {
  idle: "待機中",
  working: "作業中",
  review: "承認待ち",
  done: "完了",
  error: "エラー",
};
export const templates: Record<Template, string> = {
  program: "番組制作",
  web: "Web開発",
  video: "映像制作",
  custom: "カスタム",
};
export const roomNames: Record<RoomId, string> = {
  meeting: "会議室",
  research: "リサーチ室",
  computer: "PCルーム",
  design: "制作室",
  review: "レビュー室",
  lounge: "ラウンジ",
};
export const initialAgents: Agent[] = [
  {
    id: "producer",
    name: "Producer",
    role: "制作進行",
    specialty: "企画設計・制作進行",
    instructions: "",
    color: "#8b7dd8",
  },
  {
    id: "researcher",
    name: "Researcher",
    role: "リサーチ",
    specialty: "情報整理・企画リサーチ",
    instructions: "",
    color: "#4d9e9b",
  },
  {
    id: "writer",
    name: "Writer",
    role: "構成・台本",
    specialty: "構成・台本・文章",
    instructions: "",
    color: "#d6a45b",
  },
  {
    id: "designer",
    name: "Designer",
    role: "デザイン",
    specialty: "サムネイル・ビジュアル設計",
    instructions: "",
    color: "#ce83a6",
  },
  {
    id: "engineer",
    name: "Material Artist",
    role: "素材制作",
    specialty: "配信素材・実装案",
    instructions: "",
    color: "#6a9cd1",
  },
  {
    id: "reviewer",
    name: "Reviewer",
    role: "品質管理",
    specialty: "整合性・品質・最終確認",
    instructions: "",
    color: "#80a76f",
  },
];
export function taskProgress(tasks: Task[]) {
  return tasks.length
    ? Math.round(
        (tasks.filter((t) => t.status === "done").length / tasks.length) * 100,
      )
    : 0;
}
export function currentTask(tasks: Task[]) {
  return (
    tasks.find((t) => t.runId) ||
    tasks.find((t) => t.status === "error") ||
    tasks.find((t) => t.status === "review") ||
    tasks.find((t) => t.status === "working") ||
    tasks.find((t) => t.status === "idle") ||
    tasks[0]
  );
}
export function memberStatus(tasks: Task[]): TaskStatus {
  return (
    (["error", "review", "working"] as TaskStatus[]).find((s) =>
      tasks.some((t) => t.status === s),
    ) ??
    (tasks.length && tasks.every((t) => t.status === "done") ? "done" : "idle")
  );
}
export function locationFor(agentId: string, tasks: Task[]): RoomId {
  const status = memberStatus(tasks);
  if (status === "review") return "meeting";
  if (status === "error") return "review";
  if (status !== "working") return "lounge";
  return (
    (
      {
        producer: "meeting",
        researcher: "research",
        writer: "computer",
        designer: "design",
        engineer: "computer",
        reviewer: "review",
      } as Record<string, RoomId>
    )[agentId] ?? "computer"
  );
}
export function workflow(template: Template): [string, string][] {
  if (template === "web")
    return [
      ["要件リサーチ", "researcher"],
      ["設計確認", "producer"],
      ["画面設計", "designer"],
      ["実装計画", "engineer"],
      ["品質レビュー", "reviewer"],
    ];
  if (template === "video")
    return [
      ["企画リサーチ", "researcher"],
      ["企画確認", "producer"],
      ["構成・台本", "writer"],
      ["ビジュアル設計", "designer"],
      ["素材リスト", "engineer"],
      ["最終レビュー", "reviewer"],
    ];
  if (template === "custom")
    return [
      ["要件整理", "producer"],
      ["リサーチ", "researcher"],
      ["制作案", "writer"],
      ["最終レビュー", "reviewer"],
    ];
  return [
    ["企画リサーチ", "researcher"],
    ["企画確認", "producer"],
    ["台本制作", "writer"],
    ["台本確認", "reviewer"],
    ["サムネ構成", "designer"],
    ["素材案作成", "engineer"],
    ["最終レビュー", "reviewer"],
  ];
}
