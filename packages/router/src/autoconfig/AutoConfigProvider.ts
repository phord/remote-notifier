export interface AutoConfigProvider {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  configure(): Promise<void>;
}
