import type { ModelSchema, ModelChangeLog, ModelFields, ModelState, ModelConstructor, ModelKeys } from './types';

import { createModelClass } from '../initializers/ModelInitializer';
import { deepClone } from './utils';
import { ErrorCode, VerveError, VerveErrorList } from '../../errors';
import { IdField } from '../../field/fields/IdField';

import {
  MODEL_CHANGE_LOG,
  MODEL_FIELDS,
  MODEL_INITIAL_STATE,
  MODEL_INITIALIZER,
  MODEL_PROXY,
  MODEL_STATE,
} from '../../constants';

export class Model<S extends ModelSchema | unknown = unknown> {
  static modelName: string;
  static schema: ModelSchema;

  #proxy: Model<S> = this;
  #initializer: 'make' | 'from' = 'make';

  #fields: ModelFields<S> = {} as ModelFields<S>;
  #state: ModelState<S> = {} as ModelState<S>;

  #initialState: ModelState<S> = {} as ModelState<S>;
  #changeLog: ModelChangeLog[] = [];

  [MODEL_INITIALIZER](initializer: 'make' | 'from'): void {
    this.#initializer = initializer;
  }

  [MODEL_INITIAL_STATE](state: ModelState<S>): void {
    this.#initialState = deepClone(state);
  }

  [MODEL_CHANGE_LOG](change: ModelChangeLog): void {
    if (change.currentValue === undefined) {
      this.#changeLog = this.#changeLog.filter(log => log.field !== change.field);
      return;
    }
    this.#changeLog.push(change);
  }

  [MODEL_PROXY](proxyRef?: Model<S>): Model<S> {
    if (proxyRef) {
      this.#proxy = proxyRef;
    }
    return this.#proxy;
  }

  [MODEL_STATE](): ModelState<S> {
    return this.#state;
  }

  [MODEL_FIELDS](): ModelFields<S> {
    return this.#fields;
  }

  isNew(): boolean {
    return this.#initializer === 'make';
  }

  isExisting(): boolean {
    return this.#initializer === 'from';
  }

  getChanges() {
    const changes: Record<string, any> = {};
    const changedFields: string[] = [];

    for (const log of this.getChangeLog()) {
      if (changedFields.includes(log.field)) {
        continue;
      }
      if (this.#initialState[log.field] === log.currentValue) {
        changedFields.push(log.field);
        continue;
      }
      changes[log.field] = log.currentValue;
      changedFields.push(log.field);
    }
    return changes;
  }

  getChangeLog(): ModelChangeLog[] {
    return [...this.#changeLog].reverse();
  }

  validate(keys?: ModelKeys<S>): VerveErrorList {
    const keysArray = keys ? (Array.isArray(keys) ? keys : [keys]) : undefined;
    const errors = VerveErrorList.new();

    for (const field of Object.values(this[MODEL_FIELDS]())) {
      if (keysArray && !keysArray.includes(field.metadata.name as keyof S)) {
        continue;
      }
      const fieldErrors = field.validate();
      errors.merge(fieldErrors);
    }
    return errors;
  }

  generate(keys?: ModelKeys<S>): this {
    const keysArray = keys ? (Array.isArray(keys) ? keys : [keys]) : undefined;
    const fields = this[MODEL_FIELDS]();

    for (const field of Object.values(fields)) {
      if (keysArray && !keysArray.includes(field.metadata.name as keyof S)) {
        continue;
      }
      // If the field has a generator and is not initialized, generate the value
      if (field.options.generator && field.unsafeGet() === undefined) {
        field.generate();
      }
    }
    return this;
  }

  unsafeGet(key: keyof S): any {
    const fields = this[MODEL_FIELDS]();
    const field = fields[key as keyof ModelFields<S>];
    return field.unsafeGet();
  }

  set(data: Partial<S>): this {
    const fields = this[MODEL_FIELDS]();
    for (const [key, value] of Object.entries(data)) {
      // We do not allow setting undefined values
      if (value === undefined) {
        continue;
      }
      fields[key].set(value as any);
    }
    return this;
  }

  unset(keys: ModelKeys<S>): this {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    const fields = this[MODEL_FIELDS]();
    for (const key of keysArray) {
      fields[key].unset();
    }
    return this;
  }

  only(keys: ModelKeys<S>): this {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    const fields = this[MODEL_FIELDS]();

    for (const [fieldName, field] of Object.entries(fields)) {
      if (keysArray.includes(fieldName as keyof S)) {
        continue;
      }
      if (field instanceof IdField) {
        continue;
      }
      field.unset();
    }
    return this;
  }

  except(keys: ModelKeys<S>): this {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    const fields = this[MODEL_FIELDS]();

    for (const [fieldName, field] of Object.entries(fields)) {
      if (!keysArray.includes(fieldName as keyof S)) {
        continue;
      }
      if (field instanceof IdField) {
        throw new VerveError(ErrorCode.ID_FIELD_CANNOT_BE_EXCLUDED);
      }
      field.unset();
    }
    return this;
  }

  isValid(): boolean {
    const keys = Object.keys(this) as (keyof S)[];
    return this.hasValid(keys);
  }
  
  hasValid(keys: ModelKeys<S>): boolean {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    const fields = this[MODEL_FIELDS]();

    for (const field of Object.values(fields)) {
      if (!keysArray.includes(field.metadata.name as keyof S)) {
        continue;
      }
      if (!field.isValid()) {
        return false;
      }
    }
    return true;
  }

  isEmpty(): boolean {
    const keys = Object.keys(this) as (keyof S)[];
    return this.hasEmpty(keys);
  }
  
  hasEmpty(keys: ModelKeys<S>): boolean {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    const fields = this[MODEL_FIELDS]();

    for (const field of Object.values(fields)) {
      if (!keysArray.includes(field.metadata.name as keyof S)) {
        continue;
      }
      if (!field.isEmpty()) {
        return false;
      }
    }
    return true;
  }

  isPresent(): boolean {
    const keys = Object.keys(this) as (keyof S)[];
    return this.hasPresent(keys);
  }
  
  hasPresent(keys: ModelKeys<S>): boolean {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    const fields = this[MODEL_FIELDS]();

    for (const field of Object.values(fields)) {
      if (!keysArray.includes(field.metadata.name as keyof S)) {
        continue;
      }
      if (!field.isPresent()) {
        return false;
      }
    }
    return true;
  }

  static Untyped() {
    return createModelClass();
  }

  static Typed<T extends keyof VerveModels | any = any>(): ModelConstructor<
    T extends keyof VerveModels ? VerveModels[T] : any
  > {
    type ModelType = T extends keyof VerveModels ? VerveModels[T] : any;
    return createModelClass<ModelType>();
  }
}
