import type { StudioState, ProjectDraft, User } from "../../shared/studio";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    signal: signal ?? AbortSignal.timeout(body === undefined ? 20000 : 120000),
    ...(body !== undefined
      ? {
          method: "POST",
          headers:
            body instanceof FormData
              ? {}
              : { "Content-Type": "application/json" },
          body: body instanceof FormData ? body : JSON.stringify(body),
        }
      : {}),
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new ApiError(result.error ?? "通信に失敗しました", response.status);
  return result;
}
export const getSession = () =>
  request<{
    user: User | null;
    googleConfigured: boolean;
    development: boolean;
  }>("/api/session");
export const getState = () => request<StudioState>("/api/state");
export const sendAction = (
  action: string,
  input: Record<string, unknown> = {},
) =>
  request<{ state: StudioState; projectId?: string }>("/api/action", {
    action,
    ...input,
  });
export const structureBrief = (text: string) =>
  request<ProjectDraft>("/api/brief", { text });
export async function transcribe(blob: Blob) {
  const form = new FormData();
  form.append(
    "audio",
    blob,
    "recording." +
      (blob.type.includes("mp4")
        ? "m4a"
        : blob.type.includes("wav")
          ? "wav"
          : "webm"),
  );
  return request<{ text: string }>("/api/transcribe", form);
}
