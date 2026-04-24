import { AutoConfigProvider } from './AutoConfigProvider';

export class AutoConfigRegistry {
  private readonly providers: AutoConfigProvider[] = [];

  register(provider: AutoConfigProvider): void {
    this.providers.push(provider);
  }

  getAll(): AutoConfigProvider[] {
    return [...this.providers];
  }
}
