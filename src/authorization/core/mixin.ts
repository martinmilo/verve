import { getCanCondition } from '../decorators/can';
import { Context } from '../../context';
import { ErrorCode, VerveError } from '../../errors';

type Constructor<T = {}> = new (...args: any[]) => T;

export function WithAuthorization<TBase extends Constructor>(Base: TBase) {
  return class WithAuthorizationMixin extends Base {
    constructor(...args: any[]) {
      super(...args);

      // Wrap methods with authorization
      const proto = Object.getPrototypeOf(this);
      const methodNames = Object.getOwnPropertyNames(proto)
        .filter(name => {
          const fn = this[name as keyof this];
          return typeof fn === 'function' && !!getCanCondition(proto, name);
        });

      for (const name of methodNames) {
        const original = this[name as keyof this] as any;
        const condition = getCanCondition(proto, name);

        Object.defineProperty(this, name, {
          value: (...args: any[]) => {
            const context = (this as any).getContext?.() ?? Context.get();
            if (condition?.(context, this) === false) {
              throw new VerveError(ErrorCode.UNAUTHORIZED_METHOD_CALL, { method: String(name) });
            }
            return original.apply(this, args);
          },
          writable: false,
          configurable: false,
        });
      }
    }
  };
}