type Constructor<T = any> = new (...args: any[]) => T;
type Mixin = (base: Constructor) => Constructor;

export function composeFieldBuilder<TFinal>(
  base: Constructor,
  mixins: Mixin[]
): Constructor<TFinal> {
  let current = base;

  for (const mixin of mixins) {
    current = mixin(current);
  }

  return current as Constructor<TFinal>;
}