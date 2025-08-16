import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

let recipesCache: string[] = [];
let watcher: vscode.FileSystemWatcher | undefined;

export async function activate(context: vscode.ExtensionContext) {
    const runCmd = vscode.commands.registerCommand("justRun", async () => {
        const ws = vscode.workspace.workspaceFolders?.[0];
        if (!ws) { vscode.window.showWarningMessage('Open a folder with a Justfile.'); return; }

        const filePath = await findJustfile(ws.uri.fsPath);
        if (!filePath) { vscode.window.showWarningMessage('No Justfile/justfile found.'); return; }

        await refreshRecipes(filePath);
        if (recipesCache.length === 0) { vscode.window.showWarningMessage('No recipes found.'); return; }

        // Build a QuickPick with hotkey triggers like "[A] recipe"
        type RecipeItem = vscode.QuickPickItem & { recipe: string; hotkey?: string };
        const keys = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const items: RecipeItem[] = recipesCache.map((r, i) => {
            const hotkey = i < keys.length ? keys[i] : undefined;
            const label = `${hotkey ? `[${hotkey}] ` : ''}${r}`;
            return { label, recipe: r, hotkey, alwaysShow: true };
        });

        const qp = vscode.window.createQuickPick<RecipeItem>();
        qp.items = items;
        qp.matchOnDescription = true;
        qp.matchOnDetail = true;
        qp.title = 'Just Recipes';
        qp.placeholder = 'Press [key] to run, or select a recipe using the arrow keys';

        const disposeAll: vscode.Disposable[] = [];

        const runRecipe = (recipe: string) => {
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
            if (!val) return;
            if (val.length !== 1) return; // only handle single-char triggers
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
        const onChange = async (uri: vscode.Uri) => { await refreshRecipes(uri.fsPath); };
        watcher.onDidCreate(onChange);
        watcher.onDidChange(onChange);
        watcher.onDidDelete(() => { recipesCache = []; });
        context.subscriptions.push(watcher);
    }
}

export function deactivate() {
    watcher?.dispose();
}

async function findJustfile(root: string): Promise<string | undefined> {
    const candidates = ['Justfile', 'justfile'].map(f => path.join(root, f));
    for (const p of candidates) {
        try { await fs.access(p); return p; } catch { }
    }
    return undefined;
}

async function refreshRecipes(justfilePath: string) {
    try {
        const data = await fs.readFile(justfilePath, 'utf8');
        recipesCache = parseJustfile(data);
    } catch {
        recipesCache = [];
    }
}


export function parseJustfile(content: string): string[] {
    const names: string[] = [];
    const headerRe = /^(?!\s)(?:\[[^\]]+\]\s*)*@?(?<name>[A-Za-z_][A-Za-z0-9_-]*)(?:\s+[A-Za-z_][A-Za-z0-9_-]*\??)*\s*:(?!\=)/;

    for (const raw of content.split(/\r?\n/)) {
        const line = raw.replace(/\s+#.*$/, ''); // strip trailing comment
        if (!line.trim()) continue;
        const m = line.match(headerRe);
        if (m && m.groups && m.groups.name) names.push(m.groups.name);
    }
    return names;
}

