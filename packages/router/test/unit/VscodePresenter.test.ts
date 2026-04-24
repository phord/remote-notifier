import { describe, it, expect, vi, beforeEach } from 'vitest';
import { window } from 'vscode';
import { VscodePresenter } from '../../src/presenter/VscodePresenter';

describe('VscodePresenter', () => {
  let presenter: VscodePresenter;

  beforeEach(() => {
    vi.clearAllMocks();
    presenter = new VscodePresenter();
  });

  it('calls showInformationMessage for information level', async () => {
    await presenter.present({ message: 'hello', level: 'information' });
    expect(window.showInformationMessage).toHaveBeenCalledWith('hello');
  });

  it('calls showWarningMessage for warning level', async () => {
    await presenter.present({ message: 'hello', level: 'warning' });
    expect(window.showWarningMessage).toHaveBeenCalledWith('hello');
  });

  it('calls showErrorMessage for error level', async () => {
    await presenter.present({ message: 'hello', level: 'error' });
    expect(window.showErrorMessage).toHaveBeenCalledWith('hello');
  });

  it('defaults to information when no level specified', async () => {
    await presenter.present({ message: 'hello' });
    expect(window.showInformationMessage).toHaveBeenCalledWith('hello');
  });

  it('prepends title to message', async () => {
    await presenter.present({ message: 'done', title: 'Build' });
    expect(window.showInformationMessage).toHaveBeenCalledWith('[Build] done');
  });

  it('returns immediately without waiting for user interaction', async () => {
    let resolved = false;
    vi.mocked(window.showInformationMessage).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolved = true;
            resolve(undefined as never);
          }, 100_000);
        }),
    );
    const result = await presenter.present({ message: 'hello' });
    expect(result).toBeUndefined();
    expect(resolved).toBe(false);
  });
});
