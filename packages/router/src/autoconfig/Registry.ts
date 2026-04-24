import * as vscode from 'vscode';
import { AutoConfigRegistry } from './AutoConfigRegistry';
import { ClaudeCodeAutoConfigProvider } from './ClaudeCodeAutoConfigProvider';

export function createAutoConfigRegistry(log?: vscode.OutputChannel): AutoConfigRegistry {
  const registry = new AutoConfigRegistry();
  registry.register(new ClaudeCodeAutoConfigProvider(log));
  return registry;
}
