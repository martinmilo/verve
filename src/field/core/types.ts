import { Field } from "./Field";

export type FieldMetadata = {
  model: string;
  name: string;
};

export interface FieldOptions {
  nullable?: boolean;
  readable?: FieldAccessRule;
  writable?: FieldAccessRule;
  default?: any;
  compute?: FieldCompute | LazyFieldCompute;
  generator?: FieldGenerator | LazyFieldGenerator;
  validators?: Array<FieldValidator | LazyFieldValidator>;
}

export type FieldClass<T> = {
  new (metadata: FieldMetadata, options: FieldOptions): Field<T>;
  getGlobalValidators?(): FieldValidator[];
  getGlobalGenerator?(): FieldGenerator | undefined;
};

export type FieldAccessRule<T = any> = boolean | ((context: any, model?: any, value?: T) => boolean);

export type FieldValidator<T = any> = (value: T, model?: any) => boolean | string | void;

export type LazyFieldValidator<T = any> = FieldValidator<T> & { __lazy: true };

export type FieldGenerator<T = any> = () => T;

export type LazyFieldGenerator<T = any> = FieldGenerator<T> & { __lazy: true };

export type FieldCompute<T = any, M = any> = (model: M) => T;

export type LazyFieldCompute<T = any, M = any> = FieldCompute<T, M> & { __lazy: true };
