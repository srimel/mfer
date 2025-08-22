import { describe, it, expect } from "vitest";
import { MferConfig } from "../config-utils.js";

describe("config-utils with library support", () => {
  describe("MferConfig interface", () => {
    it("should allow optional library configuration", () => {
      // Test that the interface allows both configurations
      const configWithLibs: MferConfig = {
        base_github_url: "https://github.com/testuser",
        mfe_directory: "/test/mfes",
        lib_directory: "/test/libs",
        libs: ["lib1", "lib2"],
        groups: {
          all: ["mfe1", "mfe2"],
        },
      };

      const configWithoutLibs: MferConfig = {
        base_github_url: "https://github.com/testuser",
        mfe_directory: "/test/mfes",
        groups: {
          all: ["mfe1", "mfe2"],
        },
      };

      // If this compiles, the interface is working correctly
      expect(configWithLibs.lib_directory).toBe("/test/libs");
      expect(configWithLibs.libs).toEqual(["lib1", "lib2"]);
      expect(configWithoutLibs.lib_directory).toBeUndefined();
      expect(configWithoutLibs.libs).toBeUndefined();
    });

    it("should maintain backward compatibility", () => {
      // Test that existing configs still work
      const existingConfig: MferConfig = {
        base_github_url: "https://github.com/testuser",
        mfe_directory: "/test/mfes",
        groups: {
          all: ["mfe1", "mfe2"],
        },
      };

      expect(existingConfig.base_github_url).toBe(
        "https://github.com/testuser"
      );
      expect(existingConfig.mfe_directory).toBe("/test/mfes");
      expect(existingConfig.groups.all).toEqual(["mfe1", "mfe2"]);
      expect(existingConfig.lib_directory).toBeUndefined();
      expect(existingConfig.libs).toBeUndefined();
    });

    it("should support partial library configuration", () => {
      // Test that libs can exist without lib_directory
      const configWithLibsOnly: MferConfig = {
        base_github_url: "https://github.com/testuser",
        mfe_directory: "/test/mfes",
        libs: ["lib1", "lib2"],
        groups: {
          all: ["mfe1", "mfe2"],
        },
      };

      expect(configWithLibsOnly.libs).toEqual(["lib1", "lib2"]);
      expect(configWithLibsOnly.lib_directory).toBeUndefined();
    });

    it("should support lib_directory without libs", () => {
      // Test that lib_directory can exist without libs
      const configWithDirOnly: MferConfig = {
        base_github_url: "https://github.com/testuser",
        mfe_directory: "/test/mfes",
        lib_directory: "/test/libs",
        groups: {
          all: ["mfe1", "mfe2"],
        },
      };

      expect(configWithDirOnly.lib_directory).toBe("/test/libs");
      expect(configWithDirOnly.libs).toBeUndefined();
    });
  });

  describe("Type safety", () => {
    it("should enforce correct types for libs array", () => {
      // This test ensures TypeScript compilation works correctly
      const validConfig: MferConfig = {
        base_github_url: "https://github.com/testuser",
        mfe_directory: "/test/mfes",
        lib_directory: "/test/libs",
        libs: ["lib1", "lib2", "lib3"],
        groups: {
          all: ["mfe1", "mfe2"],
        },
      };

      // Test that libs is properly typed as string array
      expect(Array.isArray(validConfig.libs)).toBe(true);
      expect(validConfig.libs?.every((lib) => typeof lib === "string")).toBe(
        true
      );
    });

    it("should enforce correct types for lib_directory", () => {
      // This test ensures TypeScript compilation works correctly
      const validConfig: MferConfig = {
        base_github_url: "https://github.com/testuser",
        mfe_directory: "/test/mfes",
        lib_directory: "/test/libs",
        libs: ["lib1"],
        groups: {
          all: ["mfe1"],
        },
      };

      // Test that lib_directory is properly typed as string
      expect(typeof validConfig.lib_directory).toBe("string");
    });
  });
});
