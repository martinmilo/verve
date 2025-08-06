import type { WithFieldBuilder } from "../types";

import { toLazyFieldGenerator } from "../../utils/generator";

export type WithGenerateFunc<T, V> = {
  (fn: () => V): T;
  lazy(fn: () => V): T;
};

export function WithGenerate<TBase extends WithFieldBuilder>(Base: TBase) {
  return class WithGenerate extends Base {
    get generate(): WithGenerateFunc<this, any> {
      const self = this;
      const generateFunc = function (fn: () => any): typeof self {
        self.setOption('generator', fn);
        return self;
      };

      generateFunc.lazy = function (fn: () => any): typeof self {
        self.setOption('generator', toLazyFieldGenerator(fn));
        return self;
      };

      return generateFunc;
    }
  };
}
