import { describe, it, expect } from 'vitest';
import { AutoConfigRegistry } from '../../src/autoconfig/AutoConfigRegistry';
import { AutoConfigProvider } from '../../src/autoconfig/AutoConfigProvider';

describe('AutoConfigRegistry', () => {
  it('returns empty array when no providers registered', () => {
    const registry = new AutoConfigRegistry();
    expect(registry.getAll()).toEqual([]);
  });

  it('returns registered providers', () => {
    const registry = new AutoConfigRegistry();
    const provider: AutoConfigProvider = {
      id: 'test',
      label: 'Test',
      description: 'A test provider',
      configure: async () => {},
    };
    registry.register(provider);
    expect(registry.getAll()).toEqual([provider]);
  });

  it('returns a copy of the providers array', () => {
    const registry = new AutoConfigRegistry();
    const provider: AutoConfigProvider = {
      id: 'test',
      label: 'Test',
      description: 'A test provider',
      configure: async () => {},
    };
    registry.register(provider);
    const result = registry.getAll();
    result.pop();
    expect(registry.getAll()).toHaveLength(1);
  });
});
