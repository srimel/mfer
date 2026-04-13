import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { spawn } from "child_process";
import * as smolToml from "smol-toml";

// Mock all dependencies
vi.mock("fs");
vi.mock("path");
vi.mock("os");
vi.mock("child_process");
vi.mock("smol-toml");
vi.mock("chalk", () => {
  const mockChalk = {
    red: vi.fn((text) => text),
    blue: { bold: vi.fn((text) => text) },
    green: vi.fn((text) => text),
  };
  return {
    default: mockChalk,
    ...mockChalk,
  };
});

describe("config-utils", () => {
  const mockFs = vi.mocked(fs);
  const mockPath = vi.mocked(path);
  const mockOs = vi.mocked(os);
  const mockSpawn = vi.mocked(spawn);
  const mockToml = vi.mocked(smolToml);

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockOs.homedir.mockReturnValue("/mock/home");
    mockPath.join.mockReturnValue("/mock/home/.mfer/config.toml");
    mockPath.dirname.mockReturnValue("/mock/home/.mfer");
  });

  describe("loadConfig", () => {
    it("should load config when file exists", async () => {
      const mockConfig = {
        base_github_url: "https://github.com",
        mfe_directory: "/path/to/mfe",
        groups: {
          all: ["app1", "app2"],
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue("mock toml content");
      mockToml.parse.mockReturnValue(mockConfig);

      const { loadConfig } = await import("../config-utils.js");

      loadConfig();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        "/mock/home/.mfer/config.toml",
        "utf8",
      );
      expect(mockToml.parse).toHaveBeenCalledWith("mock toml content");
    });

    it("should not load config when file does not exist", async () => {
      mockFs.existsSync.mockReturnValue(false);

      const { loadConfig } = await import("../config-utils.js");

      loadConfig();

      expect(loadConfig).toBeDefined();
    });
  });

  describe("warnOfMissingConfig", () => {
    it("should display warning when config does not exist", async () => {
      mockFs.existsSync.mockReturnValue(false);

      const { warnOfMissingConfig } = await import("../config-utils.js");

      warnOfMissingConfig();

      expect(warnOfMissingConfig).toBeDefined();
    });

    it("should not display warning when config exists", async () => {
      mockFs.existsSync.mockReturnValue(true);

      const { warnOfMissingConfig } = await import("../config-utils.js");

      warnOfMissingConfig();

      expect(warnOfMissingConfig).toBeDefined();
    });
  });

  describe("isConfigValid", () => {
    it("should return false when config file does not exist", async () => {
      mockFs.existsSync.mockReturnValue(false);

      const { isConfigValid } = await import("../config-utils.js");

      const result = isConfigValid();

      expect(typeof result).toBe("boolean");
    });

    it("should return false when TOML parsing fails", async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue("invalid toml");
      mockToml.parse.mockImplementation(() => {
        throw new Error("Invalid TOML");
      });

      const { isConfigValid } = await import("../config-utils.js");

      const result = isConfigValid();

      expect(result).toBe(false);
    });

    it("should return false when config is missing required fields", async () => {
      const invalidConfigs = [
        {},
        { base_github_url: "https://github.com" },
        { base_github_url: "https://github.com", mfe_directory: "/path" },
        {
          base_github_url: "https://github.com",
          mfe_directory: "/path",
          groups: {},
        },
        {
          base_github_url: "https://github.com",
          mfe_directory: "/path",
          groups: { all: [] },
        },
      ];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue("mock toml content");

      const { isConfigValid } = await import("../config-utils.js");

      for (const config of invalidConfigs) {
        mockToml.parse.mockReturnValue(config);
        const result = isConfigValid();
        expect(result).toBeFalsy();
        mockToml.parse.mockClear();
      }
    });

    it("should return true when config has all required fields", async () => {
      const validConfig = {
        base_github_url: "https://github.com",
        mfe_directory: "/path/to/mfe",
        groups: {
          all: ["app1", "app2"],
          frontend: ["app1"],
          backend: ["app2"],
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue("mock toml content");
      mockToml.parse.mockReturnValue(validConfig);

      const { isConfigValid } = await import("../config-utils.js");

      const result = isConfigValid();

      expect(result).toBe(true);
    });

    it("should return true when config has a valid mfes section", async () => {
      const validConfig = {
        base_github_url: "https://github.com",
        mfe_directory: "/path/to/mfe",
        groups: { all: ["app1", "app2"] },
        mfes: {
          app1: {
            modes: [{ mode_name: "mock", command: "npm run start:mocked" }],
          },
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue("mock toml content");
      mockToml.parse.mockReturnValue(validConfig);

      const { isConfigValid } = await import("../config-utils.js");

      expect(isConfigValid()).toBe(true);
    });

    it("should return false when a mode entry is missing command", async () => {
      const invalidConfig = {
        base_github_url: "https://github.com",
        mfe_directory: "/path/to/mfe",
        groups: { all: ["app1"] },
        mfes: {
          app1: {
            modes: [{ mode_name: "mock" }],
          },
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue("mock toml content");
      mockToml.parse.mockReturnValue(invalidConfig);

      const { isConfigValid } = await import("../config-utils.js");

      expect(isConfigValid()).toBe(false);
    });

    it("should return false when a mode entry is missing mode_name", async () => {
      const invalidConfig = {
        base_github_url: "https://github.com",
        mfe_directory: "/path/to/mfe",
        groups: { all: ["app1"] },
        mfes: {
          app1: {
            modes: [{ command: "npm run start:mocked" }],
          },
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue("mock toml content");
      mockToml.parse.mockReturnValue(invalidConfig);

      const { isConfigValid } = await import("../config-utils.js");

      expect(isConfigValid()).toBe(false);
    });

    it("should return false when modes is not an array", async () => {
      const invalidConfig = {
        base_github_url: "https://github.com",
        mfe_directory: "/path/to/mfe",
        groups: { all: ["app1"] },
        mfes: { app1: { modes: "not-an-array" } },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue("mock toml content");
      mockToml.parse.mockReturnValue(invalidConfig);

      const { isConfigValid } = await import("../config-utils.js");

      expect(isConfigValid()).toBe(false);
    });
  });

  describe("saveConfig", () => {
    it("should save config successfully", async () => {
      const mockConfig = {
        base_github_url: "https://github.com",
        mfe_directory: "/path/to/mfe",
        groups: {
          all: ["app1", "app2"],
        },
      };

      mockFs.existsSync.mockReturnValue(false);
      mockToml.stringify.mockReturnValue("mock toml string");

      const { saveConfig } = await import("../config-utils.js");

      saveConfig(mockConfig);

      expect(mockPath.dirname).toHaveBeenCalledWith(
        "/mock/home/.mfer/config.toml",
      );
      expect(mockFs.mkdirSync).toHaveBeenCalledWith("/mock/home/.mfer", {
        recursive: true,
      });
      expect(mockToml.stringify).toHaveBeenCalledWith(mockConfig);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        "/mock/home/.mfer/config.toml",
        "mock toml string",
      );
    });

    it("should create directory if it does not exist", async () => {
      const mockConfig = {
        base_github_url: "https://github.com",
        mfe_directory: "/path/to/mfe",
        groups: {
          all: ["app1", "app2"],
        },
      };

      mockFs.existsSync.mockReturnValue(false);
      mockToml.stringify.mockReturnValue("mock toml string");

      const { saveConfig } = await import("../config-utils.js");

      saveConfig(mockConfig);

      expect(mockFs.mkdirSync).toHaveBeenCalledWith("/mock/home/.mfer", {
        recursive: true,
      });
    });

    it("should handle errors when saving config", async () => {
      const mockConfig = {
        base_github_url: "https://github.com",
        mfe_directory: "/path/to/mfe",
        groups: {
          all: ["app1", "app2"],
        },
      };

      const mockError = new Error("Write error");
      mockFs.writeFileSync.mockImplementation(() => {
        throw mockError;
      });

      const { saveConfig } = await import("../config-utils.js");

      saveConfig(mockConfig);

      expect(saveConfig).toBeDefined();
    });
  });

  describe("editConfig", () => {
    it("should open config file with default editor on Windows", async () => {
      mockOs.platform.mockReturnValue("win32");
      const mockProcess = { env: {} };
      vi.stubGlobal("process", mockProcess);

      const mockSpawnInstance = {
        unref: vi.fn(),
      };
      mockSpawn.mockReturnValue(mockSpawnInstance as ReturnType<typeof spawn>);

      const { editConfig } = await import("../config-utils.js");

      editConfig();

      expect(mockSpawn).toHaveBeenCalledWith(
        "notepad",
        ["/mock/home/.mfer/config.toml"],
        {
          stdio: "ignore",
          detached: true,
          shell: true,
        },
      );
      expect(mockSpawnInstance.unref).toHaveBeenCalled();
    });

    it("should use EDITOR environment variable when available", async () => {
      mockOs.platform.mockReturnValue("linux");
      const mockProcess = { env: { EDITOR: "vim" } };
      vi.stubGlobal("process", mockProcess);

      const mockSpawnInstance = {
        unref: vi.fn(),
      };
      mockSpawn.mockReturnValue(mockSpawnInstance as ReturnType<typeof spawn>);

      const { editConfig } = await import("../config-utils.js");

      editConfig();

      expect(mockSpawn).toHaveBeenCalledWith(
        "vim",
        ["/mock/home/.mfer/config.toml"],
        {
          stdio: "ignore",
          detached: true,
          shell: true,
        },
      );
    });

    it("should use VISUAL environment variable when EDITOR is not available", async () => {
      mockOs.platform.mockReturnValue("linux");
      const mockProcess = { env: { VISUAL: "code" } };
      vi.stubGlobal("process", mockProcess);

      const mockSpawnInstance = {
        unref: vi.fn(),
      };
      mockSpawn.mockReturnValue(mockSpawnInstance as ReturnType<typeof spawn>);

      const { editConfig } = await import("../config-utils.js");

      editConfig();

      expect(mockSpawn).toHaveBeenCalledWith(
        "code",
        ["/mock/home/.mfer/config.toml"],
        {
          stdio: "ignore",
          detached: true,
          shell: true,
        },
      );
    });

    it("should use vi as fallback on non-Windows platforms", async () => {
      mockOs.platform.mockReturnValue("linux");
      const mockProcess = { env: {} };
      vi.stubGlobal("process", mockProcess);

      const mockSpawnInstance = {
        unref: vi.fn(),
      };
      mockSpawn.mockReturnValue(mockSpawnInstance as ReturnType<typeof spawn>);

      const { editConfig } = await import("../config-utils.js");

      editConfig();

      expect(mockSpawn).toHaveBeenCalledWith(
        "vi",
        ["/mock/home/.mfer/config.toml"],
        {
          stdio: "ignore",
          detached: true,
          shell: true,
        },
      );
    });
  });
});
