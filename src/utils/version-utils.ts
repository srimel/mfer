import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import chalk from "chalk";
import { spawnSync } from "child_process";

const NOTIFIED_VERSION_FILE = path.join(
  os.homedir(),
  ".mfer",
  ".last-notified-version",
);

/**
 * Returns the currently installed version of mfer from package.json.
 */
export function getInstalledVersion(): string {
  const packageJsonPath = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    "../../package.json",
  );
  try {
    const raw = fs.readFileSync(packageJsonPath, "utf8");
    return JSON.parse(raw).version as string;
  } catch {
    return "unknown";
  }
}

/**
 * Fetches the latest published version of mfer from the npm registry.
 */
export async function getLatestVersion(): Promise<string | null> {
  try {
    const result = spawnSync("npm", ["view", "mfer", "version"], {
      stdio: "pipe",
      shell: true,
      timeout: 10000,
    });

    if (result.status !== 0 || !result.stdout) {
      return null;
    }

    return result.stdout.toString().trim();
  } catch {
    return null;
  }
}

/**
 * Reads the last version we notified the user about.
 */
function getLastNotifiedVersion(): string | null {
  try {
    return fs.readFileSync(NOTIFIED_VERSION_FILE, "utf8").trim();
  } catch {
    return null;
  }
}

/**
 * Saves the version we just notified the user about.
 */
function setLastNotifiedVersion(version: string): void {
  try {
    const dir = path.dirname(NOTIFIED_VERSION_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(NOTIFIED_VERSION_FILE, version);
  } catch {
    // silently ignore write errors
  }
}

/**
 * Checks for a newer version and notifies the user once per new version.
 * This runs as a best-effort background check and should not block the CLI.
 */
export async function checkForUpdateNotification(): Promise<void> {
  try {
    const installedVersion = getInstalledVersion();
    if (installedVersion === "unknown") return;

    const latestVersion = await getLatestVersion();
    if (!latestVersion) return;

    if (latestVersion === installedVersion) return;

    // Only notify once per new version
    const lastNotified = getLastNotifiedVersion();
    if (lastNotified === latestVersion) return;

    console.log(
      chalk.yellow(
        `\n  Update available: ${installedVersion} → ${latestVersion}`,
      ),
    );
    console.log(
      chalk.yellow(`  Run ${chalk.bold("mfer update")} to update.\n`),
    );

    setLastNotifiedVersion(latestVersion);
  } catch {
    // silently ignore errors - this is a best-effort notification
  }
}
