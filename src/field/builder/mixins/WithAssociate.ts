import { ErrorCode, VerveError } from "../../../errors";
import { WithFieldBuilder } from "../types";

export type WithAssociateFunc<T> = {
  (from: string): {
    to: (to: string) => T;
  };
};

export function WithAssociate<TBase extends WithFieldBuilder>(Base: TBase) {
  return class extends Base {
    associate(from: string) {
      let toCalled = false;
    
      const api = {
        to: (to: string): this => {
          this.setOption('associate', { from, to });
          toCalled = true;
          return this;
        }
      };
    
      return new Proxy(api, {
        get(target, prop, receiver) {
          if (!toCalled && prop !== 'to') {
            throw new VerveError(ErrorCode.ASSOCIATION_INCOMPLETE, { from });
          }
          return Reflect.get(target, prop, receiver);
        }
      });
    }
  };
}
