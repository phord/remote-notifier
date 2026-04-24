import * as vscode from 'vscode';
import { NotificationPayload, NotificationLevel } from 'remote-notifier-shared';
import { NotificationPresenter } from './NotificationPresenter';

export class VscodePresenter implements NotificationPresenter {
  async present(payload: NotificationPayload): Promise<string | undefined> {
    const level: NotificationLevel = payload.level ?? 'information';
    const message = payload.title ? `[${payload.title}] ${payload.message}` : payload.message;

    switch (level) {
      case 'warning':
        vscode.window.showWarningMessage(message);
        break;
      case 'error':
        vscode.window.showErrorMessage(message);
        break;
      default:
        vscode.window.showInformationMessage(message);
        break;
    }

    return undefined;
  }
}
