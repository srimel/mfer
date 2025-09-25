import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";

/**
 * Resolves the actual package name from a library's package.json file.
 * This handles scoped packages like @trimble-cms/prism-ui-common.
 * @param libName - The library name from configuration
 * @param libDirectory - The base library directory
 * @returns The actual package name from package.json, or the original libName if not found
 */
export function resolvePackageName(
  libName: string,
  libDirectory: string,
): string {
  const packageJsonPath = path.join(libDirectory, libName, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    console.log(
      chalk.yellow(
        `Warning: package.json not found for ${libName}, using directory name`,
      ),
    );
    return libName;
  }

  try {
    const packageJsonContent = fs.readFileSync(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonContent);

    if (packageJson.name) {
      return packageJson.name;
    }
  } catch (error) {
    console.log(
      chalk.yellow(
        `Warning: Could not parse package.json for ${libName}: ${error}`,
      ),
    );
  }

  return libName;
}
