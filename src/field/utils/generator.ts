import type { FieldGenerator, LazyFieldGenerator } from "../core/types";

export function isLazyFieldGenerator<T = any>(v: () => T | LazyFieldGenerator<T>): v is LazyFieldGenerator<T> {
  return typeof v === 'function' && '__lazy' in v;
}

export function isEagerFieldGenerator<T = any>(v: () => T | LazyFieldGenerator<T>): v is FieldGenerator<T> {
  return typeof v === 'function' && !('__lazy' in v);
}
  
export function toLazyFieldGenerator<T>(v: () => T): LazyFieldGenerator<T> {
  (v as LazyFieldGenerator<T>).__lazy = true;
  return v as LazyFieldGenerator<T>;
}
