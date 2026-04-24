import { describe, it, expect, vi, beforeEach } from 'vitest';
import { window, setMockConfig, clearMockConfig } from 'vscode';
import { FocusAwarePresenter } from '../../src/presenter/FocusAwarePresenter';
import { NotificationPresenter } from '../../src/presenter/VscodePresenter';

describe('FocusAwarePresenter', () => {
  let focusedPresenter: NotificationPresenter;
  let unfocusedPresenter: NotificationPresenter;
  let presenter: FocusAwarePresenter;

  beforeEach(() => {
    vi.clearAllMocks();
    clearMockConfig();
    focusedPresenter = { present: vi.fn().mockResolvedValue('focused-result') };
    unfocusedPresenter = { present: vi.fn().mockResolvedValue('unfocused-result') };
    presenter = new FocusAwarePresenter(focusedPresenter, unfocusedPresenter);
  });

  describe('auto mode (default)', () => {
    it('routes to focusedPresenter when window is focused', async () => {
      window.state.focused = true;
      const result = await presenter.present({ message: 'test' });
      expect(focusedPresenter.present).toHaveBeenCalledWith({ message: 'test' });
      expect(unfocusedPresenter.present).not.toHaveBeenCalled();
      expect(result).toBe('focused-result');
    });

    it('routes to unfocusedPresenter when window is not focused', async () => {
      window.state.focused = false;
      const result = await presenter.present({ message: 'test' });
      expect(unfocusedPresenter.present).toHaveBeenCalledWith({ message: 'test' });
      expect(focusedPresenter.present).not.toHaveBeenCalled();
      expect(result).toBe('unfocused-result');
    });

    it('checks focus state at call time', async () => {
      window.state.focused = true;
      await presenter.present({ message: 'first' });
      expect(focusedPresenter.present).toHaveBeenCalledTimes(1);

      window.state.focused = false;
      await presenter.present({ message: 'second' });
      expect(unfocusedPresenter.present).toHaveBeenCalledTimes(1);
    });
  });

  describe('always mode', () => {
    beforeEach(() => {
      setMockConfig('remoteNotifier.systemNotifications', 'always');
    });

    it('routes to unfocusedPresenter when focused', async () => {
      window.state.focused = true;
      await presenter.present({ message: 'test' });
      expect(unfocusedPresenter.present).toHaveBeenCalled();
      expect(focusedPresenter.present).not.toHaveBeenCalled();
    });

    it('routes to unfocusedPresenter when not focused', async () => {
      window.state.focused = false;
      await presenter.present({ message: 'test' });
      expect(unfocusedPresenter.present).toHaveBeenCalled();
      expect(focusedPresenter.present).not.toHaveBeenCalled();
    });
  });

  describe('never mode', () => {
    beforeEach(() => {
      setMockConfig('remoteNotifier.systemNotifications', 'never');
    });

    it('routes to focusedPresenter when not focused', async () => {
      window.state.focused = false;
      await presenter.present({ message: 'test' });
      expect(focusedPresenter.present).toHaveBeenCalled();
      expect(unfocusedPresenter.present).not.toHaveBeenCalled();
    });

    it('routes to focusedPresenter when focused', async () => {
      window.state.focused = true;
      await presenter.present({ message: 'test' });
      expect(focusedPresenter.present).toHaveBeenCalled();
      expect(unfocusedPresenter.present).not.toHaveBeenCalled();
    });
  });

  describe('auto mode with display hint', () => {
    it('routes to focusedPresenter when display_hint is app even if unfocused', async () => {
      window.state.focused = false;
      const result = await presenter.present({ message: 'test', display_hint: 'app' });
      expect(focusedPresenter.present).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'test', display_hint: 'app' }),
      );
      expect(unfocusedPresenter.present).not.toHaveBeenCalled();
      expect(result).toBe('focused-result');
    });

    it('routes to unfocusedPresenter when display_hint is system even if focused', async () => {
      window.state.focused = true;
      const result = await presenter.present({ message: 'test', display_hint: 'system' });
      expect(unfocusedPresenter.present).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'test', display_hint: 'system' }),
      );
      expect(focusedPresenter.present).not.toHaveBeenCalled();
      expect(result).toBe('unfocused-result');
    });

    it('falls back to focus-based routing when no display_hint', async () => {
      window.state.focused = true;
      await presenter.present({ message: 'test' });
      expect(focusedPresenter.present).toHaveBeenCalled();

      window.state.focused = false;
      await presenter.present({ message: 'test' });
      expect(unfocusedPresenter.present).toHaveBeenCalled();
    });
  });

  describe('display hint ignored in always mode', () => {
    beforeEach(() => {
      setMockConfig('remoteNotifier.systemNotifications', 'always');
    });

    it('ignores display_hint app and routes to unfocusedPresenter', async () => {
      window.state.focused = true;
      await presenter.present({ message: 'test', display_hint: 'app' });
      expect(unfocusedPresenter.present).toHaveBeenCalled();
      expect(focusedPresenter.present).not.toHaveBeenCalled();
    });
  });

  describe('display hint ignored in never mode', () => {
    beforeEach(() => {
      setMockConfig('remoteNotifier.systemNotifications', 'never');
    });

    it('ignores display_hint system and routes to focusedPresenter', async () => {
      window.state.focused = false;
      await presenter.present({ message: 'test', display_hint: 'system' });
      expect(focusedPresenter.present).toHaveBeenCalled();
      expect(unfocusedPresenter.present).not.toHaveBeenCalled();
    });
  });

  describe('reads config dynamically', () => {
    it('picks up config changes between calls', async () => {
      window.state.focused = true;

      await presenter.present({ message: 'first' });
      expect(focusedPresenter.present).toHaveBeenCalledTimes(1);

      setMockConfig('remoteNotifier.systemNotifications', 'always');
      await presenter.present({ message: 'second' });
      expect(unfocusedPresenter.present).toHaveBeenCalledTimes(1);
    });
  });
});
