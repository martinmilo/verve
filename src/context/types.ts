export interface ContextAdapter {
  get(): any;
  set(context: any): void;
  reset(): void;
  run<T>(context: any, fn: () => T): T;
};
