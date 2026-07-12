export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const ytdlpPath = process.env.YTDLP_BIN || "yt-dlp";
  const requireFunc = eval("require") as typeof require;
  const { execFile } = requireFunc("child_process") as typeof import("child_process");
  execFile(ytdlpPath, ["--version"], { timeout: 8_000 }, (error, stdout) => {
    if (error) {
      console.warn("yt-dlp not installed, please install it with brew install yt-dlp");
      return;
    }
    console.log(`yt-dlp available: ${String(stdout).trim()}`);
  });
}
