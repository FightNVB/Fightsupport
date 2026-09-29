import { spawn } from "child_process";
import path from "path";

export function runFightPassportNodeScript(
  scriptPath: string,
  args: string[],
  envExtra: Record<string, string> = {},
  logPrefix = "fightpassport"
): Promise<{ stdout: string; stderr: string; ms: number }> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      cwd: path.dirname(scriptPath),
      windowsHide: true,
      env: { ...process.env, ...envExtra },
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (data) => {
      const value = data.toString();
      stdout += value;
      process.stdout.write(`[${logPrefix}] ${value}`);
    });
    child.stderr?.on("data", (data) => {
      const value = data.toString();
      stderr += value;
      process.stderr.write(`[${logPrefix}] ${value}`);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      const ms = Date.now() - startedAt;
      if (code === 0) return resolve({ stdout, stderr, ms });
      reject(new Error(`Script failed: ${scriptPath} (exit code ${code})\n(ms=${ms})\nSTDERR:\n${stderr}\nSTDOUT:\n${stdout}`));
    });
  });
}
