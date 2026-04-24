import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

import unixScript from './code-notify.sh';
import windowsScript from './code-notify.cmd';

const execFileAsync = promisify(execFile);

export const SCRIPT_NAME = 'code-notify';

export function getBinDir(): string {
  if (process.platform === 'win32') {
    return path.join(
      process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local'),
      'RemoteNotifier',
      'bin',
    );
  }
  return path.join(os.homedir(), '.local', 'bin');
}

export class CodeNotifyScriptInstaller {
  private readonly binDir = getBinDir();

  constructor(private readonly log?: vscode.OutputChannel) {}

  async isInstalled(): Promise<boolean> {
    const isWindows = process.platform === 'win32';
    const fileName = isWindows ? `${SCRIPT_NAME}.cmd` : SCRIPT_NAME;
    const scriptPath = path.join(this.binDir, fileName);

    try {
      await fs.access(scriptPath);
      // Also check if it's on PATH
      const dirs = (process.env.PATH ?? '').split(path.delimiter);
      return dirs.includes(this.binDir);
    } catch {
      return false;
    }
  }

  async install(silent: boolean = false): Promise<void> {
    const isWindows = process.platform === 'win32';
    this.log?.appendLine(
      `[CodeNotifyScriptInstaller] Installing ${SCRIPT_NAME} to ${this.binDir} (platform: ${process.platform})`,
    );

    await fs.mkdir(this.binDir, { recursive: true });

    const fileName = isWindows ? `${SCRIPT_NAME}.cmd` : SCRIPT_NAME;
    const scriptPath = path.join(this.binDir, fileName);
    const content = isWindows ? windowsScript : unixScript;

    await fs.writeFile(scriptPath, content, { mode: 0o755 });
    this.log?.appendLine(`[CodeNotifyScriptInstaller] Wrote script to ${scriptPath}`);

    const pathNote = await this.ensureOnPath(isWindows);

    const messages = [`Installed \`${SCRIPT_NAME}\` to ${this.binDir}.`];
    if (pathNote) {
      messages.push(pathNote);
    }
    messages.push('Usage: `code-notify "Title" "Message"`');

    if (!silent) {
      vscode.window.showInformationMessage(messages.join(' '));
    }
  }

  private async ensureOnPath(isWindows: boolean): Promise<string | null> {
    const dirs = (process.env.PATH ?? '').split(path.delimiter);
    if (dirs.includes(this.binDir)) {
      this.log?.appendLine('[CodeNotifyScriptInstaller] binDir already on PATH');
      return null;
    }

    return isWindows ? this.addToPathWindows() : this.addToPathUnix();
  }

  private async addToPathWindows(): Promise<string> {
    this.log?.appendLine('[CodeNotifyScriptInstaller] Adding to Windows user PATH via PowerShell');
    try {
      const escapedDir = this.binDir.replace(/'/g, "''");
      const script = [
        `$cur = [Environment]::GetEnvironmentVariable('PATH', 'User');`,
        `if ($cur -notlike '*${escapedDir}*') {`,
        `  $sep = if ($cur -and -not $cur.EndsWith(';')) {';'} else {''};`,
        `  [Environment]::SetEnvironmentVariable('PATH', $cur + $sep + '${escapedDir}', 'User')`,
        `}`,
      ].join(' ');
      await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
      this.log?.appendLine('[CodeNotifyScriptInstaller] Windows user PATH updated');
      return 'Restart your terminal for PATH changes to take effect.';
    } catch (err) {
      this.log?.appendLine(`[CodeNotifyScriptInstaller] Failed to update Windows PATH: ${err}`);
      return `Add \`${this.binDir}\` to your PATH manually.`;
    }
  }

  private async addToPathUnix(): Promise<string> {
    const exportLine = `export PATH="${this.binDir}:$PATH"`;
    const rcFiles = this.getShellRcFiles();

    for (const rcFile of rcFiles) {
      try {
        const existing = await fs.readFile(rcFile, 'utf-8').catch(() => '');
        if (existing.includes(this.binDir)) {
          this.log?.appendLine(`[CodeNotifyScriptInstaller] ${rcFile} already contains binDir`);
          continue;
        }
        await fs.appendFile(rcFile, `\n# Added by Remote Notifier\n${exportLine}\n`);
        this.log?.appendLine(`[CodeNotifyScriptInstaller] Appended PATH to ${rcFile}`);
      } catch (err) {
        this.log?.appendLine(`[CodeNotifyScriptInstaller] Failed to update ${rcFile}: ${err}`);
      }
    }

    const name = path.basename(rcFiles[0]);
    return `Restart your terminal or run \`source ~/${name}\` for PATH changes.`;
  }

  private getShellRcFiles(): string[] {
    const home = os.homedir();
    const shell = process.env.SHELL ?? '';
    const files: string[] = [];

    if (shell.includes('zsh')) {
      files.push(path.join(home, '.zshrc'));
    }
    if (shell.includes('bash') || files.length === 0) {
      files.push(path.join(home, '.bashrc'));
    }

    return files;
  }
}
