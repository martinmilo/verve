import type { WithFieldBuilder } from "../types";

export type WithNullableProp<T> = T;

export function WithNullable<T extends WithFieldBuilder>(Base: T) {
  return class extends Base {
    get nullable(): this {
      this.setOption('nullable', true);
      return this;
    }
  }
}
