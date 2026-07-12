import { inspectWithYtDlp, type DownloadTask } from "@/lib/download-service";

const tasks = new Map<string, DownloadTask>();

export function listDownloadTasks() {
  return [...tasks.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getDownloadTask(id: string) {
  return tasks.get(id) ?? null;
}

export function createDownloadTask(url: string, quality?: string) {
  const now = new Date().toISOString();
  const task: DownloadTask = {
    id: crypto.randomUUID(),
    url,
    status: "pending",
    progress: 0,
    quality,
    created_at: now,
  };
  tasks.set(task.id, task);
  void runDownloadTask(task.id);
  return task;
}

async function runDownloadTask(id: string) {
  const task = tasks.get(id);
  if (!task) return;
  tasks.set(id, { ...task, status: "processing", progress: 20 });
  try {
    const info = await inspectWithYtDlp(task.url);
    tasks.set(id, {
      ...task,
      status: "completed",
      progress: 100,
      quality: info.quality ?? task.quality,
      info,
    });
  } catch (error) {
    const message = error instanceof Error && "code" in error && error.code === "ENOENT"
      ? "服务器未安装 yt-dlp，或 YTDLP_BIN 路径不可用。请安装 yt-dlp 后重试。"
      : error instanceof Error ? error.message : "yt-dlp 解析失败";
    tasks.set(id, {
      ...task,
      status: "failed",
      progress: 100,
      error: message,
    });
  }
}
