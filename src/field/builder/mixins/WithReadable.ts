import type { WithFieldBuilder } from "../types";
import type { FieldAccessRule } from "../../core/types";

export type WithReadableFunc<T> = {
  (rule: FieldAccessRule): T;
};

export function WithReadable<T extends WithFieldBuilder>(Base: T) {
  return class extends Base {
    readable(rule: FieldAccessRule = true): this {
      this.setOption('readable', rule);
      return this;
    }
  };
}
