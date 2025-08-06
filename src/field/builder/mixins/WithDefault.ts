import { WithFieldBuilder } from "../types";

export type WithDefaultFunc<T, V> = {
  (value: V): T;
};

export function WithDefault<T extends WithFieldBuilder>(Base: T) {
  return class extends Base {
    get default(): WithDefaultFunc<this, any> {
      const self = this;
      
      return function (value: T): typeof self {
        self.setOption('default', value);
        return self;
      };
    }
  }
}
