import { Context } from './Context';
import { MODEL_CONTEXT } from '../../constants';

type Constructor<T = {}> = new (...args: any[]) => T;

export function WithContext<TBase extends Constructor>(Base: TBase) {
  return class WithContextMixin extends Base {
    [MODEL_CONTEXT]?: any;

    static withContext<T extends typeof Base>(this: T, context: any): T {
      const Subclass = class extends this {};
      (Subclass as any)[MODEL_CONTEXT] = context;
      return Subclass as T;
    }

    withContext(context: any): this {
      this[MODEL_CONTEXT] = context;
      return this;
    }

    getContext(): any {
      return this[MODEL_CONTEXT]
        ?? (this.constructor as any)[MODEL_CONTEXT]
        ?? Context.get();
    }
  };
}