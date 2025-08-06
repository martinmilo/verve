import type { FieldCompute, LazyFieldCompute } from "../core/types";

export function isLazyFieldCompute<T = any>(v: FieldCompute<T> | LazyFieldCompute<T>): v is LazyFieldCompute<T> {
  return typeof v === 'function' && '__lazy' in v;
}

export function isEagerFieldCompute<T = any>(v: FieldCompute<T> | LazyFieldCompute<T>): v is FieldCompute<T> {
  return typeof v === 'function' && !('__lazy' in v);
}
  
export function toLazyFieldCompute<T>(v: FieldCompute<T>): LazyFieldCompute<T> {
  (v as LazyFieldCompute<T>).__lazy = true;
  return v as LazyFieldCompute<T>;
}
