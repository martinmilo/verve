import { MODEL_CHANGE_LOG, MODEL_CONSTRUCTOR, MODEL_STATE } from "../../constants";
import { BoundField, Field, FieldBuilder } from "../../field";
import { Model } from "./Model";

export type ModelSchema = Record<string, FieldBuilder<any>>;

export interface ModelConstructor<T> { 
  new (internal: typeof MODEL_CONSTRUCTOR): Model<T> & T;

  make<C extends new (...args: any[]) => any>(
    this: C,
    data: StrictPartial<StripDollarProps<T>>
  ): InstanceType<C> & ModelInstance<T>;

  from<C extends new (...args: any[]) => any>(
    this: C,
    data: StrictPartial<StripDollarProps<T>>
  ): InstanceType<C> & ModelInstance<T>;
}

export interface ModelInstance<T = Record<string, any>> {
  [MODEL_STATE](): T;
  [MODEL_CHANGE_LOG](change: ModelChangeLog): void;
  constructor: { name: string };
  getContext(): any;
  withContext(context: any): this;
  isNew(): boolean;
  isExisting(): boolean;
  getChanges(): Partial<T>;
  getChangeLog(): ModelChangeLog[];
  validate(): string[];
  only(keys: (keyof StripDollarProps<T>)[]): this;
  except(keys: (keyof StripDollarProps<T>)[]): this;
}

export type ModelChangeLog = {
  field: string;
  currentValue: any;
  previousValue: any;
  timestamp: Date;
};

export type InferFieldInstance<F extends FieldBuilder<any>> = ReturnType<F['toField']>;
export type ModelFields<S> =
  S extends ModelSchema
    ? { [K in keyof S as `$${string & K}`]: BoundField<InferFieldInstance<S[K]>> }
    : { [key: string]: BoundField<any> };

export type InferFieldType<F> = F extends Field<infer T> ? T : never;
export type ModelState<S> =
  S extends ModelSchema
    ? { [K in keyof S]: InferFieldType<S[K]> }
    : { [key: string]: any };

export type StrictPartial<T> = {
  [K in keyof T]?: T[K];
};
export type StripDollarProps<T> = {
  [K in keyof T as K extends `$${string}` ? never : K]: T[K];
};