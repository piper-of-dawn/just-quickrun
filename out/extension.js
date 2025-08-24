"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
exports.parseJustfile = parseJustfile;
const vscode = require("vscode");
const fs = require("fs/promises");
const path = require("path");
let recipesCache = [];
let watcher;
async function activate(context) {
    const runCmd = vscode.commands.registerCommand("justRun", async () => {
        const ws = vscode.workspace.workspaceFolders?.[0];
        if (!ws) {
            vscode.window.showWarningMessage('Open a folder with a Justfile.');
            return;
        }
        const filePath = await findJustfile(ws.uri.fsPath);
        if (!filePath) {
            vscode.window.showWarningMessage('No Justfile/justfile found.');
            return;
        }
        await refreshRecipes(filePath);
        if (recipesCache.length === 0) {
            vscode.window.showWarningMessage('No recipes found.');
            return;
        }
        const keys = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const items = recipesCache.map((r, i) => {
            const hotkey = i < keys.length ? keys[i] : undefined;
            const label = `${hotkey ? `[${hotkey}] ` : ''}${r}`;
            return { label, recipe: r, hotkey, alwaysShow: true };
        });
        const qp = vscode.window.createQuickPick();
        qp.items = items;
        qp.matchOnDescription = true;
        qp.matchOnDetail = true;
        qp.title = 'Just Recipes';
        qp.placeholder = 'Press [key] to run, or select a recipe using the arrow keys';
        const disposeAll = [];
        const runRecipe = (recipe) => {
            let terminal = vscode.window.terminals.find(t => t.name === 'Just') ?? vscode.window.createTerminal('Just');
            terminal.sendText(`just ${recipe}`);
            terminal.show();
        };
        // Accept selected item (Enter or click)
        disposeAll.push(qp.onDidAccept(() => {
            const sel = qp.selectedItems[0];
            if (sel) {
                runRecipe(sel.recipe);
            }
            qp.hide();
        }));
        // Single-key hotkey: when value becomes one character and matches a hotkey, run immediately
        disposeAll.push(qp.onDidChangeValue((val) => {
            if (!val)
                return;
            if (val.length !== 1)
                return; // only handle single-char triggers
            const ch = val.toUpperCase();
            const match = items.find(it => it.hotkey === ch);
            if (match) {
                runRecipe(match.recipe);
                qp.hide();
            }
        }));
        // Clean up
        disposeAll.push(qp.onDidHide(() => {
            disposeAll.forEach(d => d.dispose());
            qp.dispose();
        }));
        qp.show();
    });
    context.subscriptions.push(runCmd);
    // Set up watcher once a workspace opens
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (ws) {
        const justGlob = new vscode.RelativePattern(ws, '{Justfile,justfile}');
        watcher = vscode.workspace.createFileSystemWatcher(justGlob);
        const onChange = async (uri) => { await refreshRecipes(uri.fsPath); };
        watcher.onDidCreate(onChange);
        watcher.onDidChange(onChange);
        watcher.onDidDelete(() => { recipesCache = []; });
        context.subscriptions.push(watcher);
    }
}
function deactivate() {
    watcher?.dispose();
}
async function findJustfile(root) {
    const candidates = ['Justfile', 'justfile', '.justfile', '.Justfile'].map(f => path.join(root, f));
    for (const p of candidates) {
        try {
            await fs.access(p);
            return p;
        }
        catch { }
    }
    return undefined;
}
async function refreshRecipes(justfilePath) {
    try {
        const data = await fs.readFile(justfilePath, 'utf8');
        recipesCache = parseJustfile(data);
    }
    catch {
        recipesCache = [];
    }
}
function parseJustfile(content) {
    const names = [];
    const headerRe = /^(?!\s)(?:\[[^\]]+\]\s*)*@?(?<name>[A-Za-z_][A-Za-z0-9_-]*)(?:\s+[A-Za-z_][A-Za-z0-9_-]*\??)*\s*:(?!\=)/;
    for (const raw of content.split(/\r?\n/)) {
        const line = raw.replace(/\s+#.*$/, ''); // strip trailing comment
        if (!line.trim())
            continue;
        const m = line.match(headerRe);
        if (m && m.groups && m.groups.name)
            names.push(m.groups.name);
    }
    return names;
}
//# sourceMappingURL=extension.js.map