import * as vscode from 'vscode';
import * as path from 'path';
import * as notifier from 'node-notifier';
import { NotificationPayload } from 'remote-notifier-shared';
import { NotificationPresenter } from './VscodePresenter';
import { exec } from 'child_process';

const ICONS: Record<string, string> = {
  transparent: path.join(__dirname, 'icon-transparent.png'),
  dark: path.join(__dirname, 'icon.png'),
};

export class SystemPresenter implements NotificationPresenter {
  constructor(private readonly log?: vscode.OutputChannel) {}

  async present(payload: NotificationPayload): Promise<string | undefined> {
    const title = payload.title ?? 'Remote Notifier';
    const config = vscode.workspace.getConfiguration('remoteNotifier');
    const iconStyle = config.get<string>('notificationIcon', 'transparent');
    const sound = config.get<boolean>('notificationSound', true);
    const soundPath = config.get<string>('notificationSoundPath', '');
    const mappings = config.get<Record<string, string>>('iconMappings', {});
    const iconPath =
      (payload.icon && mappings[payload.icon]) || ICONS[iconStyle] || ICONS.transparent;

    this.log?.appendLine(
      `[SystemPresenter] Sending OS notification: title="${title}" message="${payload.message}" icon="${iconPath}" sound=${sound}`,
    );

    // On macOS, terminal-notifier handles sound natively via the `sound` field
    // (accepts a file path, a named system sound, or true for the default alert sound).
    // On Linux, notify-send ignores sound; we play it separately via pw-play.
    const platform = process.platform;
    const notifierSound = platform === 'darwin' ? (sound ? soundPath || true : false) : sound;

    try {
      notifier.notify(
        {
          title,
          message: payload.message,
          icon: iconPath,
          sound: notifierSound,
          wait: false,
          appName: 'Remote Notifier',
        } as notifier.Notification,
        (err) => {
          if (err) {
            this.log?.appendLine(`[SystemPresenter] System notification error: ${err}`);
          }
        },
      );

      if (platform === 'linux' && sound && soundPath) {
        exec(`pw-play ${JSON.stringify(soundPath)}`);
      }

      this.log?.appendLine('[SystemPresenter] notifier.notify() called successfully');
    } catch (err) {
      this.log?.appendLine(`[SystemPresenter] notifier.notify() threw: ${err}`);
    }

    return undefined;
  }
}
