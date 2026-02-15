import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { spawnSync } from "child_process";

vi.mock("fs");
vi.mock("path");
vi.mock("os");
vi.mock("child_process");
vi.mock("chalk", () => {
  const bold = vi.fn((text: string) => text);
  const mockChalk = {
    yellow: Object.assign(
      vi.fn((text: string) => text),
      { bold },
    ),
    blue: vi.fn((text: string) => text),
    green: vi.fn((text: string) => text),
    red: vi.fn((text: string) => text),
    bold: vi.fn((text: string) => text),
  };
  return { default: mockChalk, ...mockChalk };
});

describe("version-utils", () => {
  const mockFs = vi.mocked(fs);
  const mockPath = vi.mocked(path);
  const mockOs = vi.mocked(os);
  const mockSpawnSync = vi.mocked(spawnSync);
  let mockConsoleLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockOs.homedir.mockReturnValue("/mock/home");
    mockPath.join.mockImplementation((...args: string[]) => args.join("/"));
    mockPath.dirname.mockReturnValue("/mock/dir");
    mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getInstalledVersion", () => {
    it("should return version from package.json", async () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: "3.1.0" }));

      const { getInstalledVersion } = await import("../version-utils.js");
      const version = getInstalledVersion();

      expect(version).toBe("3.1.0");
    });

    it("should return 'unknown' if package.json cannot be read", async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error("File not found");
      });

      const { getInstalledVersion } = await import("../version-utils.js");
      const version = getInstalledVersion();

      expect(version).toBe("unknown");
    });
  });

  describe("getLatestVersion", () => {
    it("should return latest version from npm registry", async () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from("3.2.0\n"),
        stderr: Buffer.from(""),
        pid: 1,
        output: [],
        signal: null,
      });

      const { getLatestVersion } = await import("../version-utils.js");
      const version = await getLatestVersion();

      expect(version).toBe("3.2.0");
      expect(mockSpawnSync).toHaveBeenCalledWith(
        "npm",
        ["view", "mfer", "version"],
        expect.objectContaining({ stdio: "pipe", shell: true }),
      );
    });

    it("should return null when npm command fails", async () => {
      mockSpawnSync.mockReturnValue({
        status: 1,
        stdout: Buffer.from(""),
        stderr: Buffer.from("error"),
        pid: 1,
        output: [],
        signal: null,
      });

      const { getLatestVersion } = await import("../version-utils.js");
      const version = await getLatestVersion();

      expect(version).toBeNull();
    });

    it("should return null when stdout is empty", async () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: null as unknown as Buffer,
        stderr: Buffer.from(""),
        pid: 1,
        output: [],
        signal: null,
      });

      const { getLatestVersion } = await import("../version-utils.js");
      const version = await getLatestVersion();

      expect(version).toBeNull();
    });
  });

  describe("checkForUpdateNotification", () => {
    it("should notify when a new version is available", async () => {
      // Mock getInstalledVersion returns 3.1.0
      mockFs.readFileSync.mockImplementation(
        (filePath: fs.PathOrFileDescriptor) => {
          const p = filePath.toString();
          if (p.includes("package.json")) {
            return JSON.stringify({ version: "3.1.0" });
          }
          // .last-notified-version - throw to simulate not found
          throw new Error("File not found");
        },
      );

      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from("3.2.0\n"),
        stderr: Buffer.from(""),
        pid: 1,
        output: [],
        signal: null,
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockImplementation(() => {});

      const { checkForUpdateNotification } = await import(
        "../version-utils.js"
      );
      await checkForUpdateNotification();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Update available"),
      );
    });

    it("should not notify when already on latest version", async () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: "3.1.0" }));

      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from("3.1.0\n"),
        stderr: Buffer.from(""),
        pid: 1,
        output: [],
        signal: null,
      });

      const { checkForUpdateNotification } = await import(
        "../version-utils.js"
      );
      await checkForUpdateNotification();

      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        expect.stringContaining("Update available"),
      );
    });

    it("should not notify when already notified for this version", async () => {
      let readCount = 0;
      mockFs.readFileSync.mockImplementation(() => {
        readCount++;
        if (readCount === 1) {
          return JSON.stringify({ version: "3.1.0" });
        }
        // second read is the notified version file
        return "3.2.0";
      });

      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: Buffer.from("3.2.0\n"),
        stderr: Buffer.from(""),
        pid: 1,
        output: [],
        signal: null,
      });

      const { checkForUpdateNotification } = await import(
        "../version-utils.js"
      );
      await checkForUpdateNotification();

      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        expect.stringContaining("Update available"),
      );
    });

    it("should not notify when installed version is unknown", async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error("File not found");
      });

      const { checkForUpdateNotification } = await import(
        "../version-utils.js"
      );
      await checkForUpdateNotification();

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it("should not notify when latest version cannot be fetched", async () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: "3.1.0" }));

      mockSpawnSync.mockReturnValue({
        status: 1,
        stdout: Buffer.from(""),
        stderr: Buffer.from("error"),
        pid: 1,
        output: [],
        signal: null,
      });

      const { checkForUpdateNotification } = await import(
        "../version-utils.js"
      );
      await checkForUpdateNotification();

      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        expect.stringContaining("Update available"),
      );
    });
  });
});
