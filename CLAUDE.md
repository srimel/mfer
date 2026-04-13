# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**mfer** (Micro Frontend Runner) is a TypeScript CLI tool for managing and running multiple micro frontend applications. It handles concurrent execution, git operations (clone/pull), npm installs, and internal library management across many repos.

## Commands

```bash
npm run build          # Compile TypeScript → dist/
npm run watch          # Watch mode with auto-recompilation
npm test               # Run all tests with Vitest
npm run test:coverage  # Tests + coverage report
npm run lint           # ESLint + Prettier check
npm run lint:fix       # Auto-fix linting issues
```

Run a single test file:

```bash
npx vitest run src/commands/__tests__/run.test.ts
```

Manual testing workflow (after `npm run build`):

```bash
npm uninstall -g mfer   # remove any published version
npm install -g .        # install local build globally
mfer <command>          # test commands directly
```

## Architecture

### Entry Point & Command Registration

`src/index.ts` is the CLI entry point — it imports and registers all commands with the Commander.js `program` instance.

### Command Pattern

Each command lives in `src/commands/` as its own file, exported as a default `Command` instance. Sub-command groups (e.g., `lib`, `config`) are directories with an `index.ts` that registers sub-commands.

```typescript
const myCommand = new Command("name")
  .description("...")
  .option("--select", "interactively select items")
  .action(async (options) => { ... });

export default myCommand;
```

### Configuration

Config is YAML stored at `~/.mfer/config.yaml`. Load it via `src/utils/config-utils.ts` utilities (`loadConfig`, `configExists`, `warnOfMissingConfig`). Always check `configExists` before operating. Config shape:

```yaml
base_github_url: "https://github.com/username"
mfe_directory: "/path/to/microfrontends"
lib_directory: "/path/to/libs" # optional
libs: [lib1, lib2] # optional
groups:
  all: [mfe1, mfe2]
  custom: [mfe1]
mfes: # optional, per-MFE config
  mfe1:
    modes:
      - mode_name: mock
        command: npm run start:mocked
```

### Utilities

- `src/utils/config-utils.ts` — load/save/validate YAML config
- `src/utils/command-utils.ts` — shared logic (running processes, filtering by group/selection)
- `src/utils/lib-utils.ts` — library-specific helpers

### Process Execution

- **Concurrent** operations use the `concurrently` package (e.g., `mfer run`)
- **Sequential** operations use `child_process.spawn` with `stdio: 'inherit'`
- Always handle SIGINT for graceful shutdown

### The `--select` Flag

Commands that accept a group argument also support `--select` for interactive checkbox selection via `@inquirer/prompts`. This pattern is consistent across `run`, `pull`, `install`, `clone`, and the `lib` sub-commands.

## Conventions

- **ES modules only** — use `.js` extensions in all imports (even for `.ts` source files)
- **No CommonJS** — no `require()`
- **Kebab-case** filenames for utilities, lowercase for commands
- **chalk** color conventions: green=success, red=error, yellow=warning, blue=info
- **path.join()** always — never hardcoded path separators
- **Always update README.md** when adding or modifying any command (including the Quick Reference section and full command documentation with examples)
