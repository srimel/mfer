import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { promptForMFESelection } from "../command-utils.js";

// Mock the @inquirer/prompts module
vi.mock("@inquirer/prompts", () => ({
  checkbox: vi.fn(),
}));

// Mock chalk to avoid color output in tests
vi.mock("chalk", () => ({
  default: {
    blue: vi.fn((text: string) => text),
    yellow: vi.fn((text: string) => text),
  },
}));

// Mock process.exit to prevent actual exit
const mockExit = vi.spyOn(process, "exit").mockImplementation((code) => {
  throw new Error(`process.exit called with code ${code}`);
});

// Mock console.log to capture output
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

describe("command-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("promptForMFESelection", () => {
    it("should prompt user and return selected MFEs", async () => {
      const { checkbox } = await import("@inquirer/prompts");
      const mockCheckbox = vi.mocked(checkbox);

      const groupName = "test-group";
      const mfes = ["mfe1", "mfe2", "mfe3"];
      const selectedMFEs = ["mfe1", "mfe3"];

      mockCheckbox.mockResolvedValue(selectedMFEs);

      const result = await promptForMFESelection(groupName, mfes);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        `Select micro frontends to operate on from group '${groupName}':`
      );
      expect(mockCheckbox).toHaveBeenCalledWith({
        message: "Choose which micro frontends to operate on:",
        choices: [
          { name: "mfe1", value: "mfe1" },
          { name: "mfe2", value: "mfe2" },
          { name: "mfe3", value: "mfe3" },
        ],
        validate: expect.any(Function),
      });
      expect(result).toEqual(selectedMFEs);
    });

    it("should validate that at least one MFE is selected", async () => {
      const { checkbox } = await import("@inquirer/prompts");
      const mockCheckbox = vi.mocked(checkbox);

      const groupName = "test-group";
      const mfes = ["mfe1", "mfe2"];

      // Get the validate function that was passed to checkbox
      let validateFunction: (arr: string[]) => boolean | string;
      mockCheckbox.mockImplementation((options) => {
        validateFunction = options.validate as unknown as (
          arr: string[]
        ) => boolean | string;
        return Promise.resolve([]) as any;
      });

      await promptForMFESelection(groupName, mfes);

      // Test validation function
      expect(validateFunction!([])).toBe("Select at least one micro frontend");
      expect(validateFunction!(["mfe1"])).toBe(true);
      expect(validateFunction!(["mfe1", "mfe2"])).toBe(true);
    });

    it("should handle SIGINT error and exit with code 130", async () => {
      const { checkbox } = await import("@inquirer/prompts");
      const mockCheckbox = vi.mocked(checkbox);

      const groupName = "test-group";
      const mfes = ["mfe1", "mfe2"];
      const sigintError = new Error("User force closed");

      mockCheckbox.mockRejectedValue(sigintError);

      // The function should throw an error due to process.exit being called
      await expect(promptForMFESelection(groupName, mfes)).rejects.toThrow();
    });

    it("should handle SIGINT error with different message format", async () => {
      const { checkbox } = await import("@inquirer/prompts");
      const mockCheckbox = vi.mocked(checkbox);

      const groupName = "test-group";
      const mfes = ["mfe1", "mfe2"];
      const sigintError = new Error("SIGINT received");

      mockCheckbox.mockRejectedValue(sigintError);

      // The function should throw an error due to process.exit being called
      await expect(promptForMFESelection(groupName, mfes)).rejects.toThrow();
    });

    it("should re-throw non-SIGINT errors", async () => {
      const { checkbox } = await import("@inquirer/prompts");
      const mockCheckbox = vi.mocked(checkbox);

      const groupName = "test-group";
      const mfes = ["mfe1", "mfe2"];
      const otherError = new Error("Some other error");

      mockCheckbox.mockRejectedValue(otherError);

      await expect(promptForMFESelection(groupName, mfes)).rejects.toThrow(
        "Some other error"
      );

      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        "\nReceived SIGINT. Stopping..."
      );
      expect(mockExit).not.toHaveBeenCalled();
    });

    it("should handle empty MFE list", async () => {
      const { checkbox } = await import("@inquirer/prompts");
      const mockCheckbox = vi.mocked(checkbox);

      const groupName = "empty-group";
      const mfes: string[] = [];
      const selectedMFEs: string[] = [];

      mockCheckbox.mockResolvedValue(selectedMFEs);

      const result = await promptForMFESelection(groupName, mfes);

      expect(mockCheckbox).toHaveBeenCalledWith({
        message: "Choose which micro frontends to operate on:",
        choices: [],
        validate: expect.any(Function),
      });
      expect(result).toEqual(selectedMFEs);
    });

    it("should handle single MFE selection", async () => {
      const { checkbox } = await import("@inquirer/prompts");
      const mockCheckbox = vi.mocked(checkbox);

      const groupName = "single-group";
      const mfes = ["mfe1"];
      const selectedMFEs = ["mfe1"];

      mockCheckbox.mockResolvedValue(selectedMFEs);

      const result = await promptForMFESelection(groupName, mfes);

      expect(mockCheckbox).toHaveBeenCalledWith({
        message: "Choose which micro frontends to operate on:",
        choices: [{ name: "mfe1", value: "mfe1" }],
        validate: expect.any(Function),
      });
      expect(result).toEqual(selectedMFEs);
    });

    it("should handle error without message property", async () => {
      const { checkbox } = await import("@inquirer/prompts");
      const mockCheckbox = vi.mocked(checkbox);

      const groupName = "test-group";
      const mfes = ["mfe1", "mfe2"];
      const errorWithoutMessage = { code: "SOME_ERROR" };

      mockCheckbox.mockRejectedValue(errorWithoutMessage);

      await expect(promptForMFESelection(groupName, mfes)).rejects.toEqual(
        errorWithoutMessage
      );

      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        "\nReceived SIGINT. Stopping..."
      );
      expect(mockExit).not.toHaveBeenCalled();
    });

    it("should handle non-Error objects", async () => {
      const { checkbox } = await import("@inquirer/prompts");
      const mockCheckbox = vi.mocked(checkbox);

      const groupName = "test-group";
      const mfes = ["mfe1", "mfe2"];
      const stringError = "String error";

      mockCheckbox.mockRejectedValue(stringError);

      await expect(promptForMFESelection(groupName, mfes)).rejects.toBe(
        stringError
      );

      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        "\nReceived SIGINT. Stopping..."
      );
      expect(mockExit).not.toHaveBeenCalled();
    });
  });
});
