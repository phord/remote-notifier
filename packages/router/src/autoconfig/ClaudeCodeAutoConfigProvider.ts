import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { AutoConfigProvider } from './AutoConfigProvider';
import { SCRIPT_NAME } from '../installer/CodeNotifyScriptInstaller';

const execFileAsync = promisify(execFile);

interface HookEntry {
  matcher?: string;
  hooks: { type: string; command: string; timeout: number }[];
}

interface ClaudeSettings {
  hooks?: Record<string, HookEntry[]>;
  [key: string]: unknown;
}

type Platform = 'unix' | 'windows';

export class ClaudeCodeAutoConfigProvider implements AutoConfigProvider {
  readonly id = 'claude-code';
  readonly label = 'Claude Code';
  readonly description =
    'Configure Claude Code hooks to send notifications when finished or needs user input';

  constructor(private readonly log?: vscode.OutputChannel) {}

  async configure(): Promise<void> {
    const platform: Platform = process.platform === 'win32' ? 'windows' : 'unix';

    const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

    let raw: string;
    try {
      raw = await fs.readFile(settingsPath, 'utf-8');
    } catch {
      vscode.window.showErrorMessage(
        `Could not find Claude Code settings at ${settingsPath}. Please ensure Claude Code is installed and has been run at least once.`,
      );
      return;
    }

    let settings: ClaudeSettings;
    try {
      settings = JSON.parse(raw);
    } catch {
      vscode.window.showErrorMessage(
        `Claude Code settings at ${settingsPath} contains invalid JSON. Please fix it manually before running auto-configure.`,
      );
      return;
    }

    const useJq = platform === 'unix' && (await this.checkJqAvailable());
    if (useJq === null) {
      return;
    }

    const desired = this.buildHooks(platform, useJq);

    if (!settings.hooks) {
      settings.hooks = {};
    }

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const [category, entries] of Object.entries(desired)) {
      if (!settings.hooks[category]) {
        settings.hooks[category] = [];
      }
      const existing = settings.hooks[category];

      for (const entry of entries) {
        const idx = existing.findIndex(
          (e) => this.isCodeNotifyHook(e) && this.matchesMatcher(e, entry),
        );

        if (idx === -1) {
          existing.push(entry);
          added++;
          this.log?.appendLine(
            `[ClaudeCodeAutoConfig] Added ${category}${entry.matcher ? ` (${entry.matcher})` : ''} hook`,
          );
        } else if (this.isIdentical(existing[idx], entry)) {
          skipped++;
          this.log?.appendLine(
            `[ClaudeCodeAutoConfig] Skipped ${category}${entry.matcher ? ` (${entry.matcher})` : ''} hook (identical)`,
          );
        } else {
          existing[idx] = entry;
          updated++;
          this.log?.appendLine(
            `[ClaudeCodeAutoConfig] Updated ${category}${entry.matcher ? ` (${entry.matcher})` : ''} hook`,
          );
        }
      }
    }

    if (added === 0 && updated === 0) {
      vscode.window.showInformationMessage(
        'Claude Code hooks are already configured. No changes made.',
      );
      return;
    }

    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');

    const parts: string[] = [];
    if (added > 0) parts.push(`${added} added`);
    if (updated > 0) parts.push(`${updated} updated`);
    if (skipped > 0) parts.push(`${skipped} unchanged`);
    vscode.window.showInformationMessage(
      `Claude Code hooks configured successfully (${parts.join(', ')}).`,
    );
  }

  buildHooks(platform: Platform, useJq: boolean): Record<string, HookEntry[]> {
    const cmdPath = this.getCommandPath(platform);

    if (platform === 'windows') {
      return this.buildWindowsHooks(cmdPath);
    }
    return this.buildUnixHooks(cmdPath, useJq);
  }

  private getCommandPath(platform: Platform): string {
    if (platform === 'windows') {
      return `%LOCALAPPDATA%\\RemoteNotifier\\bin\\${SCRIPT_NAME}.cmd`;
    }
    return `~/.local/bin/${SCRIPT_NAME}`;
  }

  private buildUnixHooks(cmdPath: string, useJq: boolean): Record<string, HookEntry[]> {
    const elicitationCommand = useJq
      ? `msg=$(jq -r '(.tool_input.questions // [{}])[0].question // "Has a question for you"' 2>/dev/null) && ${cmdPath} -i ICON_CLAUDE_CODE 'Claude Code' "$msg" 2>/dev/null || true`
      : `${cmdPath} -i ICON_CLAUDE_CODE 'Claude Code' 'Has a question for you' 2>/dev/null || true`;

    return {
      Stop: [
        {
          hooks: [
            {
              type: 'command',
              command: `${cmdPath} -i ICON_CLAUDE_CODE 'Claude Code' 'Finished — waiting for your input' 2>/dev/null || true`,
              timeout: 5,
            },
          ],
        },
      ],
      Notification: [
        {
          matcher: 'permission_prompt',
          hooks: [
            {
              type: 'command',
              command: `${cmdPath} -i ICON_CLAUDE_CODE 'Claude Code' 'Waiting for permission to use a tool' 2>/dev/null || true`,
              timeout: 5,
            },
          ],
        },
        {
          matcher: 'elicitation_dialog',
          hooks: [
            {
              type: 'command',
              command: elicitationCommand,
              timeout: 5,
            },
          ],
        },
      ],
    };
  }

  private buildWindowsHooks(cmdPath: string): Record<string, HookEntry[]> {
    return {
      Stop: [
        {
          hooks: [
            {
              type: 'command',
              command: `${cmdPath} -i ICON_CLAUDE_CODE "Claude Code" "Finished — waiting for your input" 2>nul`,
              timeout: 5,
            },
          ],
        },
      ],
      Notification: [
        {
          matcher: 'permission_prompt',
          hooks: [
            {
              type: 'command',
              command: `${cmdPath} -i ICON_CLAUDE_CODE "Claude Code" "Waiting for permission to use a tool" 2>nul`,
              timeout: 5,
            },
          ],
        },
        {
          matcher: 'elicitation_dialog',
          hooks: [
            {
              type: 'command',
              command: `${cmdPath} -i ICON_CLAUDE_CODE "Claude Code" "Has a question for you" 2>nul`,
              timeout: 5,
            },
          ],
        },
      ],
    };
  }

  private async checkJqAvailable(): Promise<boolean | null> {
    try {
      await execFileAsync('which', ['jq']);
      return true;
    } catch {
      const choice = await vscode.window.showWarningMessage(
        'jq is not installed. The elicitation hook can extract question text with jq, or use a simpler notification without it. Continue without jq?',
        'Use simple notification',
        'Cancel',
      );
      if (choice === 'Use simple notification') {
        return false;
      }
      return null;
    }
  }

  private isCodeNotifyHook(entry: HookEntry): boolean {
    return entry.hooks?.some((h) => h.command?.includes('code-notify')) ?? false;
  }

  private matchesMatcher(a: HookEntry, b: HookEntry): boolean {
    return (a.matcher ?? '') === (b.matcher ?? '');
  }

  private isIdentical(a: HookEntry, b: HookEntry): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }
}
