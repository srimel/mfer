# Development

## Getting Started

1. Run `npm i` to install dependencies.
2. Run `npm run build` to build the project.
3. Run `npm install -g .` to link the project globally.
4. Now you can run the CLI as `mfer` for locally development anywhere on your system. Try `mfer --help` to begin.
5. Updating the code will require another `npm run build`.

## Troubleshooting

If you run into problems first check `npm list -g` if the project is successfully linked globally.

Sometimes you may need to run `npm uninstall -g run-mfs` and then follow up with another `npm install -g .` within the project's root directory.

## Publishing

1. Run `npm run build`
2. Run `npm run publish`

### Adding another tag to same release

- Run `npm dist-tag add mfer@<version> <tag>`