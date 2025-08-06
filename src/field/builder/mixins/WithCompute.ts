import type { WithFieldBuilder } from "../types";

import { toLazyFieldCompute } from "../../utils/compute";
import { FieldCompute } from "../../core/types";

export type WithComputeFunc<T> = {
  <M extends keyof VerveModels = any>(fn: (model: VerveModels[M]) => any): T;
  lazy<M extends keyof VerveModels = any>(fn: (model: VerveModels[M]) => any): T;
};

export function WithCompute<TBase extends WithFieldBuilder>(Base: TBase) {
  return class WithCompute extends Base {
    get compute(): WithComputeFunc<this> {
      const self = this;

      const computeFunc = (<M extends keyof VerveModels = any>(fn: (model: VerveModels[M]) => any): typeof self => {
        self.setOption('compute', fn as unknown as FieldCompute<TBase, M>);
        return self;
      }) as WithComputeFunc<this>;

      computeFunc.lazy = <M extends keyof VerveModels = any>(fn: (model: VerveModels[M]) => any): typeof self => {
        self.setOption('compute', toLazyFieldCompute(fn as unknown as FieldCompute<TBase, M>));
        return self;
      };

      return computeFunc;
    }
  };
}