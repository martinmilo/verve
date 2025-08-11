import { MODEL_CHANGE_LOG, MODEL_CONSTRUCTOR, MODEL_PROXY, MODEL_STATE } from "../../constants";
import { BoundField, Field, FieldBuilder } from "../../field";
import { Model } from "./Model";
import { VerveErrorList } from "../../errors";

export type ModelSchema = Record<string, FieldBuilder<any>>;

export interface ModelConstructor<T> { 
  new (internal: typeof MODEL_CONSTRUCTOR): Model<T> & T;

  make<C extends new (...args: any[]) => any>(this: C, data: StrictPartial<T>): InstanceType<C> & ModelInstance<T>;
  from<C extends new (...args: any[]) => any>(this: C, data: StrictPartial<T>): InstanceType<C> & ModelInstance<T>;
}

export interface ModelInstance<T = Record<string, any>> {
  [MODEL_STATE](): T;
  [MODEL_PROXY](): Model<T>;
  [MODEL_CHANGE_LOG](change: ModelChangeLog): void;
  constructor: { name: string };
  getContext(): any;
  withContext(context: any): this;
  isNew(): boolean;
  isExisting(): boolean;
  getChanges(): Partial<T>;
  getChangeLog(): ModelChangeLog[];
  validate(keys?: ModelKeys<T>): VerveErrorList;
  generate(keys?: ModelKeys<T>): this;
  unsafeGet(key: keyof T): any;
  set(data: Partial<T>): this;
  unset(keys: ModelKeys<T>): this;
  only(keys: ModelKeys<T>): this;
  except(keys: ModelKeys<T>): this;
  isValid(): boolean;
  hasValid(keys: ModelKeys<T>): boolean;
  isEmpty(): boolean;
  hasEmpty(keys: ModelKeys<T>): boolean;
  isPresent(): boolean;
  hasPresent(keys: ModelKeys<T>): boolean;
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
    ? { [K in ModelKey<S>]: BoundField<InferFieldInstance<S[K]>> }
    : { [key: string]: BoundField<any> };

export type InferFieldType<F> = F extends Field<infer T> ? T : never;
export type ModelState<S> =
  S extends ModelSchema
    ? { [K in ModelKey<S>]: InferFieldType<S[K]> }
    : { [key: string]: any };

export type StrictPartial<T> = {
  [K in keyof T]?: T[K];
};

export type ModelKey<S> = keyof S;
export type ModelKeys<S> = ModelKey<S> | (ModelKey<S>)[];
