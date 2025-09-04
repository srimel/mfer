# Development

## Getting Started

1. Run `npm i` to install dependencies.
2. Run `npm run build` to build the project.
3. Run `npm install -g .` to link the project globally.
4. Now you can run the CLI as `mfer` for locally development anywhere on your system. Try `mfer --help` to begin.
5. Updating the code will require another `npm run build`.

## Testing with the Playground

The project includes a `playground` directory with sample micro frontends for testing the CLI commands. The playground contains:

### Structure

```
playground/
├── libs/
│   └── common-utils/      # Shared utility library
└── frontends/
    ├── mfe1/              # React micro frontend 1
    ├── mfe2/              # React micro frontend 2
    └── mfe3/              # React micro frontend 3
```

### Setup

1. Navigate to the playground directory:

   ```bash
   cd playground
   ```

2. Install dependencies for the common-utils library:

   ```bash
   cd libs/common-utils
   npm install
   cd ../..
   ```

3. Install dependencies for each micro frontend:

   ```bash
   cd frontends/mfe1 && npm install && cd ../..
   cd frontends/mfe2 && npm install && cd ../..
   cd frontends/mfe3 && npm install && cd ../..
   ```

4. **Port Configuration**: Each micro frontend is pre-configured to use different ports:
   - mfe1: Port 3000
   - mfe2: Port 3001
   - mfe3: Port 3002

### Testing Commands

Once the playground is set up, you can test various mfer commands:

#### Initialize a new mfer configuration

```bash
mfer init
```

#### Run all micro frontends

```bash
mfer run
```

#### Run specific micro frontends

```bash
mfer run mfe1 mfe2
```

#### Install dependencies for all projects

```bash
mfer install
```

#### Pull latest changes (if using git)

```bash
mfer pull
```

#### Build all projects

```bash
mfer lib build
```

### Features of the Playground

- **common-utils**: A shared library that exports utility functions used by all micro frontends
- **mfe1, mfe2, mfe3**: Three React applications with different color schemes that demonstrate:
  - Shared dependency usage (common-utils)
  - Console logging from shared utilities
  - Timestamp display
  - Different visual styling for easy identification

Each micro frontend is configured to run on specific ports:

- **mfe1**: http://localhost:3000
- **mfe2**: http://localhost:3001
- **mfe3**: http://localhost:3002

They can be accessed independently or managed together through mfer commands.

## Troubleshooting

If you run into problems first check `npm list -g` if the project is successfully linked globally.

Sometimes you may need to run `npm uninstall -g run-mfs` and then follow up with another `npm install -g .` within the project's root directory.

### Playground Issues

- If you encounter dependency issues, make sure to install dependencies in the correct order: common-utils first, then the micro frontends
- The playground uses a structured layout with `libs/` and `frontends/` directories for better organization
- If ports are already in use, React will automatically suggest alternative ports
- For Windows users, make sure to use the correct path separators in commands
