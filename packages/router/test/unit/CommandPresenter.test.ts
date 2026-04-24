import { describe, it, expect, vi, beforeEach } from 'vitest';
import { commands } from 'vscode';
import { CommandPresenter } from '../../src/presenter/CommandPresenter';
import { NotificationPresenter } from '../../src/presenter/NotificationPresenter';
import { COMMAND_SHOW_NOTIFICATION } from 'remote-notifier-shared';

describe('CommandPresenter', () => {
  let fallback: NotificationPresenter;
  let presenter: CommandPresenter;

  beforeEach(() => {
    vi.clearAllMocks();
    fallback = { present: vi.fn().mockResolvedValue('fallback-result') };
    presenter = new CommandPresenter(fallback);
  });

  it('calls executeCommand with correct command and payload', async () => {
    const payload = { message: 'test', level: 'information' as const };
    await presenter.present(payload);
    expect(commands.executeCommand).toHaveBeenCalledWith(COMMAND_SHOW_NOTIFICATION, payload);
  });

  it('returns result from executeCommand', async () => {
    vi.mocked(commands.executeCommand).mockResolvedValue('user-clicked' as never);
    const result = await presenter.present({ message: 'test' });
    expect(result).toBe('user-clicked');
  });

  it('falls back to fallback presenter when command not found', async () => {
    vi.mocked(commands.executeCommand).mockRejectedValue(new Error('command not found'));
    const result = await presenter.present({ message: 'test' });
    expect(fallback.present).toHaveBeenCalledWith({ message: 'test' });
    expect(result).toBe('fallback-result');
  });

  it('falls back on any executeCommand error', async () => {
    vi.mocked(commands.executeCommand).mockRejectedValue(new Error('timeout'));
    await presenter.present({ message: 'test' });
    expect(fallback.present).toHaveBeenCalled();
  });
});
