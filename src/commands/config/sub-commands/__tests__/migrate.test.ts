import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import YAML from "yaml";
import * as smolToml from "smol-toml";
import { confirm } from "@inquirer/prompts";

vi.mock("fs");
vi.mock("yaml");
vi.mock("smol-toml");
vi.mock("@inquirer/prompts");
vi.mock("chalk", () => {
  const mockChalk = {
    red: vi.fn((text) => text),
    green: vi.fn((text) => text),
    yellow: vi.fn((text) => text),
  };
  return { default: mockChalk, ...mockChalk };
});

const mockFs = vi.mocked(fs);
const mockYaml = vi.mocked(YAML);
const mockToml = vi.mocked(smolToml);
const mockConfirm = vi.mocked(confirm);

const validParsed = {
  base_github_url: "https://github.com/u",
  mfe_directory: "/p",
  groups: { all: ["a"] },
};

describe("config migrate command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("errors when no legacy yaml exists", async () => {
    mockFs.existsSync.mockReturnValue(false);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { migrateConfigCommand } = await import("../migrate.js");
    await migrateConfigCommand.parseAsync(["node", "migrate"]);

    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    expect(logSpy.mock.calls[0][0]).toContain("No YAML config found");
    logSpy.mockRestore();
  });

  it("converts yaml to toml when no toml exists", async () => {
    mockFs.existsSync.mockImplementation((p) =>
      String(p).endsWith("config.yaml"),
    );
    mockFs.readFileSync.mockReturnValue("yaml content");
    mockYaml.parse.mockReturnValue(validParsed);
    mockToml.stringify.mockReturnValue("toml output");
    mockConfirm.mockResolvedValue(false);

    const { migrateConfigCommand } = await import("../migrate.js");
    await migrateConfigCommand.parseAsync(["node", "migrate"]);

    expect(mockYaml.parse).toHaveBeenCalledWith("yaml content");
    expect(mockToml.stringify).toHaveBeenCalledWith(validParsed);
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("config.toml"),
      "toml output",
    );
  });

  it("aborts when user declines overwrite prompt", async () => {
    mockFs.existsSync.mockReturnValue(true); // both yaml and toml exist
    mockFs.readFileSync.mockReturnValue("yaml content");
    mockYaml.parse.mockReturnValue(validParsed);
    mockConfirm.mockResolvedValueOnce(false); // overwrite? no

    const { migrateConfigCommand } = await import("../migrate.js");
    await migrateConfigCommand.parseAsync(["node", "migrate"]);

    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("deletes legacy yaml when user confirms", async () => {
    mockFs.existsSync.mockImplementation((p) =>
      String(p).endsWith("config.yaml"),
    );
    mockFs.readFileSync.mockReturnValue("yaml content");
    mockYaml.parse.mockReturnValue(validParsed);
    mockToml.stringify.mockReturnValue("toml output");
    mockConfirm.mockResolvedValue(true); // delete legacy? yes

    const { migrateConfigCommand } = await import("../migrate.js");
    await migrateConfigCommand.parseAsync(["node", "migrate"]);

    expect(mockFs.unlinkSync).toHaveBeenCalledWith(
      expect.stringContaining("config.yaml"),
    );
  });

  it("errors when yaml fails to parse", async () => {
    mockFs.existsSync.mockImplementation((p) =>
      String(p).endsWith("config.yaml"),
    );
    mockFs.readFileSync.mockReturnValue("bad yaml");
    mockYaml.parse.mockImplementation(() => {
      throw new Error("boom");
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { migrateConfigCommand } = await import("../migrate.js");
    await migrateConfigCommand.parseAsync(["node", "migrate"]);

    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    expect(
      logSpy.mock.calls.some((c) =>
        String(c[0]).includes("Failed to parse YAML"),
      ),
    ).toBe(true);
    logSpy.mockRestore();
  });
});
