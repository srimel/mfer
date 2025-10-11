import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import runCommand from "../run.js";
import path from "path";

// Mock dependencies
vi.mock("../../utils/config-utils.js", () => ({
  configExists: true,
  currentConfig: {
    mfe_directory: "/test/mfe",
    groups: {
      all: ["mfe1", "mfe2", "mfe3"],
      home: ["mfe1", "mfe2"],
      dashboard: ["mfe3"],
    },
  },
  warnOfMissingConfig: vi.fn(),
}));

vi.mock("concurrently", () => ({
  default: vi.fn(() => ({
    commands: [],
    result: Promise.resolve(),
  })),
}));

vi.mock("@inquirer/prompts", () => ({
  checkbox: vi.fn(),
}));

// Mock child_process.spawn
vi.mock("child_process", () => ({
  spawn: vi.fn(() => ({
    on: vi.fn(),
    stdio: "inherit",
  })),
}));

describe("run command", () => {
  let mockConsoleLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should run with default command when no custom command is provided", async () => {
    const concurrently = (await import("concurrently")).default;

    await runCommand.parseAsync(["run", "home"]);

    expect(concurrently).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          command: "npm start",
          name: "mfe1",
          cwd: path.join("/test/mfe", "mfe1"),
        }),
        expect.objectContaining({
          command: "npm start",
          name: "mfe2",
          cwd: path.join("/test/mfe", "mfe2"),
        }),
      ]),
      expect.objectContaining({
        prefix: "{name} |",
        killOthersOn: ["failure", "success"],
        restartTries: 0,
      })
    );
  });

  it("should run custom command sequentially by default", async () => {
    const { spawn } = await import("child_process");
    const mockSpawn = vi.mocked(spawn);

    // Mock the spawn process to simulate successful completion
    const mockChild = {
      on: vi.fn((event, callback) => {
        if (event === "close") {
          callback(0);
        }
        return mockChild;
      }),
    };
    mockSpawn.mockReturnValue(mockChild as unknown as ReturnType<typeof spawn>);

    await runCommand.parseAsync(["run", "home", "--command", "npm ci"]);

    // Should call spawn for each MFE in the group
    expect(mockSpawn).toHaveBeenCalled();
    expect(mockSpawn).toHaveBeenCalledWith("npm ci", [], {
      stdio: "inherit",
      cwd: expect.stringMatching(/[\\\/]test[\\\/]mfe[\\\/]mfe\d+/),
      shell: true,
    });
  });

  it("should run custom command concurrently when --command --async is used", async () => {
    const concurrently = (await import("concurrently")).default;

    await runCommand.parseAsync([
      "run",
      "home",
      "--command",
      "npm ci",
      "--async",
    ]);

    expect(concurrently).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          command: "npm ci",
          name: "mfe1",
          cwd: path.join("/test/mfe", "mfe1"),
        }),
        expect.objectContaining({
          command: "npm ci",
          name: "mfe2",
          cwd: path.join("/test/mfe", "mfe2"),
        }),
      ]),
      expect.objectContaining({
        prefix: "{name} |",
        killOthersOn: ["failure", "success"],
        restartTries: 0,
      })
    );
  });

  it("should run custom command concurrently when -c -a is used", async () => {
    const concurrently = (await import("concurrently")).default;

    await runCommand.parseAsync(["run", "home", "-c", "yarn install", "-a"]);

    expect(concurrently).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          command: "yarn install",
          name: "mfe1",
          cwd: path.join("/test/mfe", "mfe1"),
        }),
        expect.objectContaining({
          command: "yarn install",
          name: "mfe2",
          cwd: path.join("/test/mfe", "mfe2"),
        }),
      ]),
      expect.objectContaining({
        prefix: "{name} |",
        killOthersOn: ["failure", "success"],
        restartTries: 0,
      })
    );
  });

  it("should handle commands with spaces and special characters", async () => {
    const { spawn } = await import("child_process");
    const mockSpawn = vi.mocked(spawn);

    const mockChild = {
      on: vi.fn((event, callback) => {
        if (event === "close") {
          callback(0);
        }
        return mockChild;
      }),
    };
    mockSpawn.mockReturnValue(mockChild as unknown as ReturnType<typeof spawn>);

    await runCommand.parseAsync([
      "run",
      "home",
      "--command",
      "npm run build -- --mode production",
    ]);

    expect(mockSpawn).toHaveBeenCalledWith(
      "npm run build -- --mode production",
      [],
      {
        stdio: "inherit",
        cwd: expect.stringMatching(/[\\\/]test[\\\/]mfe[\\\/]mfe\d+/),
        shell: true,
      }
    );
  });

  it("should show appropriate execution mode in success message for sequential", async () => {
    await runCommand.parseAsync(["run", "home", "--command", "npm ci"]);

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining(
        "Running custom command 'npm ci' on micro frontends in group 'all'..."
      )
    );
  });

  it("should show appropriate execution mode in success message for concurrent", async () => {
    await runCommand.parseAsync([
      "run",
      "home",
      "--command",
      "npm ci",
      "--async",
    ]);

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining(
        "Running custom command 'npm ci' on micro frontends in group 'all'..."
      )
    );
  });

  it("should validate whitespace-only custom command", async () => {
    await runCommand.parseAsync(["run", "home", "--command", "   "]);

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Error: custom command cannot be empty")
    );
  });

  it("should prevent using --async without --command", async () => {
    await runCommand.parseAsync(["run", "home", "--async"]);

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining(
        "Error: --async can only be used with --command option"
      )
    );
  });
});
