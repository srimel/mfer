# mfer (Micro Frontend Runner)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful CLI tool designed to simplify the management and execution of multiple micro frontend applications. mfer helps developers run, update, and organize their micro frontend projects with minimal configuration and maximum efficiency.

## 📋 Table of Contents

- [🚀 Features](#-features)
- [📦 Installation](#-installation)
- [🛠️ Quick Start](#️-quick-start)
- [📋 Commands](#-commands)
- [⚙️ Configuration](#️-configuration)
- [🎯 Use Cases](#-use-cases)
- [🔧 Advanced Usage](#-advanced-usage)
- [🐛 Troubleshooting](#-troubleshooting)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)

## 🚀 Features

- **Concurrent Execution**: Run multiple micro frontends simultaneously with organized output
- **Group Management**: Organize micro frontends into logical groups for selective execution
- **Git Integration**: Pull latest changes from all repositories with a single command
- **Smart Configuration**: Interactive setup wizard with YAML-based configuration
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Graceful Shutdown**: Clean termination of all processes with Ctrl+C

## 📦 Installation

### Prerequisites

- Node.js 18 or higher
- Git (for repository management)

### Install from npm

```bash
npm install -g mfer
```

### Install from source

```bash
git clone https://github.com/srimel/mfer.git
cd mfer
npm install
npm run build
npm install -g .
```

## 🛠️ Quick Start

### 1. Initialize Configuration

Start by setting up your mfer configuration:

```bash
mfer init
```

This interactive wizard will guide you through:

- Setting up your GitHub username
- Specifying the directory containing your micro frontends
- Selecting which projects to include in your default group

### 2. Run Your Micro Frontends

```bash
# Run all micro frontends
mfer run

# Run a specific group
mfer run frontend

# Run with a custom group name
mfer run shared
```

### 3. Update Your Repositories

```bash
# Pull latest changes from all repositories
mfer pull

# Pull from a specific group
mfer pull frontend
```

## 📋 Commands

### Quick Reference

- [`mfer init`](#mfer-init) - Interactive setup wizard
- [`mfer run`](#mfer-run-group_name) - Run micro frontend applications
- [`mfer pull`](#mfer-pull-group_name) - Pull latest changes from git repositories
- [`mfer install`](#mfer-install-group_name) - Install dependencies for micro frontends
- [`mfer clone`](#mfer-clone-group_name) - Clone repositories that don't exist locally
- [`mfer config`](#mfer-config) - Manage configuration settings
- [`mfer help`](#mfer-help) - Display help information

### `mfer init`

Interactive setup wizard to create your configuration file.

**Options:**

- `-f, --force`: Force re-initialization even if config exists

**Example:**

```bash
mfer init --force
```

### `mfer run [group_name]`

Run micro frontend applications concurrently.

**Arguments:**

- `group_name`: Name of the group to run (defaults to "all")

**Example:**

```bash
mfer run          # Run all micro frontends
mfer run frontend # Run only frontend group
```

### `mfer pull [group_name]`

Pull latest changes from git repositories.

**Arguments:**

- `group_name`: Name of the group to pull from (defaults to "all")

**Example:**

```bash
mfer pull         # Pull from all repositories
mfer pull shared  # Pull from shared components group only
```

### `mfer install [group_name]`

Install dependencies for all micro frontends in a group.

**Arguments:**

- `group_name`: Name of the group to install dependencies for (defaults to "all")

**Example:**

```bash
mfer install          # Install dependencies for all micro frontends
mfer install frontend # Install dependencies for frontend group only
```

### `mfer clone [group_name]`

Clone repositories that don't exist locally.

**Arguments:**

- `group_name`: Name of the group to clone repositories from (defaults to "all")

**Example:**

```bash
mfer clone          # Clone all repositories
mfer clone shared   # Clone repositories in shared group only
```

### `mfer config`

Manage your configuration settings.

**Subcommands:**

- `mfer config list`: Display current configuration
- `mfer config edit`: Open configuration file in your default editor

**Example:**

```bash
mfer config list    # Show current configuration
mfer config edit    # Edit configuration in your editor
```

### `mfer help`

Display help information for mfer commands.

**Example:**

```bash
mfer help           # Show general help
mfer help run       # Show help for run command
mfer help config    # Show help for config command
```

## ⚙️ Configuration

mfer uses a YAML configuration file located at `~/.mfer/config.yaml`. Here's an example structure:

```yaml
base_github_url: "https://github.com/your-username"
mfe_directory: "/path/to/your/micro-frontends"
groups:
  all:
    - my-main-app
    - my-admin-panel
    - my-shared-components
  main:
    - my-main-app
    - my-shared-components
  admin:
    - my-admin-panel
    - my-shared-components
```

### Configuration Options

- **`base_github_url`**: Your GitHub base URL for repository operations
- **`mfe_directory`**: Path to the directory containing all your micro frontend projects
- **`groups`**: Named collections of micro frontend projects
  - **`all`**: Default group containing all projects (required)
  - **Custom groups**: Any additional groups you want to create

### Editing Configuration

You can edit your configuration in several ways:

1. **Interactive editor** (recommended):

   ```bash
   mfer config edit
   ```

2. **Direct file editing**:

   ```bash
   # On macOS/Linux
   nano ~/.mfer/config.yaml

   # On Windows
   notepad %USERPROFILE%\.mfer\config.yaml
   ```

## 🎯 Use Cases

### Development Workflow

```bash
# Start your day
mfer pull          # Get latest changes
mfer run main      # Start main application

# Later, switch to admin panel work
mfer run admin     # Start admin panel
```

### Project Organization

Organize your micro frontends into logical groups:

```yaml
groups:
  all:
    - main-app
    - admin-panel
    - user-dashboard
    - shared-components
    - design-system
  core:
    - main-app
    - shared-components
    - design-system
  admin:
    - admin-panel
    - user-dashboard
    - shared-components
  ui:
    - shared-components
    - design-system
```

### Team Collaboration

- Share configuration files with your team
- Standardize development environment setup
- Ensure everyone runs the same services

## 🔧 Advanced Usage

### Custom Start Commands

By default, mfer runs `npm start` in each project directory.
You can currently only customize this by modifying the run command in the source code.

Adding configurable custom start commands is something I plan on adding in the near future.
I also welcome anyone to open a PR for that!

### Environment Variables

mfer respects your existing environment setup and will use the same Node.js and npm versions you have configured.

### Process Management

- All processes are managed concurrently with organized output
- Use Ctrl+C to gracefully shut down all running services
- Failed processes are reported with detailed error information

## 🐛 Troubleshooting

### Common Issues

**"No configuration file detected"**

```bash
# Run the initialization wizard
mfer init
```

**"Group not found"**

```bash
# Check available groups
mfer config list

# Edit configuration to add missing group
mfer config edit
```

**"Directory does not exist"**

- Ensure the `mfe_directory` path in your configuration is correct
- Use absolute paths for better reliability
- Check that the directory exists and is accessible

**"Not a git repository"**

- Ensure all projects in your configuration are valid git repositories
- Run `mfer clone` to clone missing repositories

### Development Mode

For local development of mfer itself:

```bash
git clone https://github.com/srimel/mfer.git
cd mfer
npm install
npm run build
npm install -g .
```

Refer to [local development](./docs/local-development.md) docs for more information.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with:

- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Inquirer](https://github.com/SBoudrias/Inquirer.js) - Interactive prompts
- [Concurrently](https://github.com/open-cli-tools/concurrently) - Process management
- [Chalk](https://github.com/chalk/chalk) - Terminal styling
- [YAML](https://github.com/eemeli/yaml) - Configuration parsing
