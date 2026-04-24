import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as notifier from 'node-notifier';
import { setMockConfig, clearMockConfig } from 'vscode';
import { SystemPresenter } from '../../src/presenter/SystemPresenter';

describe('SystemPresenter', () => {
  let presenter: SystemPresenter;

  beforeEach(() => {
    vi.clearAllMocks();
    clearMockConfig();
    presenter = new SystemPresenter();
  });

  it('calls notifier.notify with title, message, and icon', async () => {
    await presenter.present({ message: 'Build done', title: 'CI' });
    expect(notifier.notify).toHaveBeenCalledWith(
      {
        title: 'CI',
        message: 'Build done',
        icon: expect.stringContaining('icon-transparent.png'),
        sound: true,
        wait: false,
        appName: 'Remote Notifier',
      },
      expect.any(Function),
    );
  });

  it('uses "Remote Notifier" as default title when none provided', async () => {
    await presenter.present({ message: 'Hello' });
    expect(notifier.notify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Remote Notifier' }),
      expect.any(Function),
    );
  });

  it('passes the message as-is', async () => {
    await presenter.present({ message: 'Special chars: <>&"\'\\n' });
    expect(notifier.notify).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Special chars: <>&"\'\\n' }),
      expect.any(Function),
    );
  });

  it('returns immediately without waiting', async () => {
    const result = await presenter.present({ message: 'test' });
    expect(result).toBeUndefined();
  });

  it('does not throw when notifier throws', async () => {
    vi.mocked(notifier.notify).mockImplementation(() => {
      throw new Error('notifier failed');
    });
    await expect(presenter.present({ message: 'test' })).resolves.toBeUndefined();
  });

  describe('icon mappings', () => {
    it('uses mapped icon path when payload icon key matches', async () => {
      setMockConfig('remoteNotifier.iconMappings', { claude: '/custom/claude-icon.png' });
      await presenter.present({ message: 'test', icon: 'claude' });
      expect(notifier.notify).toHaveBeenCalledWith(
        expect.objectContaining({ icon: '/custom/claude-icon.png' }),
        expect.any(Function),
      );
    });

    it('falls back to default icon when icon key is not in mappings', async () => {
      setMockConfig('remoteNotifier.iconMappings', { claude: '/custom/claude-icon.png' });
      await presenter.present({ message: 'test', icon: 'unknown' });
      expect(notifier.notify).toHaveBeenCalledWith(
        expect.objectContaining({ icon: expect.stringContaining('icon-transparent.png') }),
        expect.any(Function),
      );
    });

    it('falls back to default icon when no icon key in payload', async () => {
      setMockConfig('remoteNotifier.iconMappings', { claude: '/custom/claude-icon.png' });
      await presenter.present({ message: 'test' });
      expect(notifier.notify).toHaveBeenCalledWith(
        expect.objectContaining({ icon: expect.stringContaining('icon-transparent.png') }),
        expect.any(Function),
      );
    });

    it('falls back to default icon when iconMappings is empty', async () => {
      await presenter.present({ message: 'test', icon: 'claude' });
      expect(notifier.notify).toHaveBeenCalledWith(
        expect.objectContaining({ icon: expect.stringContaining('icon-transparent.png') }),
        expect.any(Function),
      );
    });
  });
});
