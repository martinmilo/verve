import type { WithFieldBuilder } from "../types";
import type { FieldAccessRule } from "../../core/types";

export type WithWritableFunc<T> = {
  (rule: FieldAccessRule): T;
};

export function WithWritable<T extends WithFieldBuilder>(Base: T) {
  return class extends Base {
    writable(rule: FieldAccessRule = true): this {
      this.setOption('writable', rule);
      return this;
    }
  };
}
