# Just QuickRun: One-key recipe runner

Run your Justfile recipes from VS Code with a single key.

- Alt+J opens a Quick Pick of recipes with one-key hotkeys
- Press the highlighted key (1-9, A-Z) to run immediately
- Runs `just <recipe>` in an integrated terminal named "Just"

## Requirements

- Just must be installed and available on your PATH.
  - Project page: https://github.com/casey/just
- Open a workspace folder that contains a `Justfile` (or `justfile`).

## Usage

- Press `Alt+J` to open the recipe picker, or run the command:
  - Command Palette → "Just Run Recipe" (command id: `justRun`)
- Type to filter, press Enter to run the selected item, or press its single-character hotkey to run instantly.

## How it works

- Detects `Justfile`/`justfile` in the first workspace folder.
- Parses recipe headers and displays them in a Quick Pick with assigned hotkeys.
- Sends `just <recipe>` to an integrated terminal named "Just" and focuses it.
- Watches the Justfile and refreshes recipes when it changes.

## Installation

- From Marketplace (when published): install "Just QuickRun: One-key recipe runner".
- From source (development):
  1. `npm install`
  2. `npm run watch` (optional for live rebuilds)
  3. Press `F5` in VS Code to launch the Extension Development Host.

## Keybinding

- Default: `Alt+J` on Windows, macOS, and Linux.
- Change it via File → Preferences → Keyboard Shortcuts and search for `justRun`.

## Troubleshooting

- "No Justfile/justfile found": Ensure you opened a folder containing a `Justfile`.
- "Command not found: just": Install Just and/or add it to your PATH, then reload VS Code.
- Nothing happens on key press: Check that no other extension overrides `Alt+J`.

## Limitations

- Operates on the first workspace folder only.
- Runs recipes by name without prompting for parameters.
