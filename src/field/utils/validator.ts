import type { FieldClass, FieldValidator, LazyFieldValidator } from "../core/types";

export function isLazyFieldValidator<T = any>(v: FieldValidator<T> | LazyFieldValidator<T>): v is LazyFieldValidator<T> {
  return typeof v === 'function' && '__lazy' in v;
}

export function isEagerFieldValidator<T = any>(v: FieldValidator<T> | LazyFieldValidator<T>): v is FieldValidator<T> {
  return typeof v === 'function' && !('__lazy' in v);
}

export function toLazyFieldValidator<T>(v: FieldValidator<T>): LazyFieldValidator<T> {
  (v as LazyFieldValidator<T>).__lazy = true;
  return v as LazyFieldValidator<T>;
}

export function mergeFieldValidators<T>(FieldClass: FieldClass<T>, validators: (FieldValidator | LazyFieldValidator)[]): (FieldValidator | LazyFieldValidator)[] {
  const fieldValidators = FieldClass.getGlobalValidators?.() ?? [];
  return [...fieldValidators, ...validators];
}
