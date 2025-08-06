import type { ModelSchema, ModelChangeLog, ModelFields, ModelState, ModelConstructor, StripDollarProps } from './types';

import { createModelClass } from '../initializers/ModelInitializer';
import { deepClone, makeFieldInstanceKey } from './utils';
import { ErrorCode, VerveError, VerveErrorList } from '../../errors';
import { IdField } from '../../field/fields/IdField';

import {
  MODEL_CHANGE_LOG,
  MODEL_FIELDS,
  MODEL_INITIAL_STATE,
  MODEL_INITIALIZER,
  MODEL_STATE,
} from '../../constants';

export class Model<S extends ModelSchema | unknown = unknown> {
  static modelName: string;
  static schema: ModelSchema;

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

  validate(): VerveErrorList {
    const errors = VerveErrorList.new();

    for (const field of Object.values(this[MODEL_FIELDS]())) {
      const fieldErrors = field.validate();
      errors.merge(fieldErrors);
    }
    return errors;
  }

  only(keys: (keyof StripDollarProps<S>)[]): this {
    const fieldKeysToKeep = keys.map(key => makeFieldInstanceKey(key as string));
    const fields = this[MODEL_FIELDS]();

    for (const [fieldName, field] of Object.entries(fields)) {
      if (fieldKeysToKeep.includes(fieldName as `$${string}`)) {
        continue;
      }
      if (field instanceof IdField) {
        continue;
      }
      field.unset();
    }
    return this;
  }

  except(keys: (keyof StripDollarProps<S>)[]): this {
    const fieldKeysToExclude = keys.map(key => makeFieldInstanceKey(key as string));
    const fields = this[MODEL_FIELDS]();

    for (const [fieldName, field] of Object.entries(fields)) {
      if (!fieldKeysToExclude.includes(fieldName as `$${string}`)) {
        continue;
      }
      if (field instanceof IdField) {
        throw new VerveError(ErrorCode.ID_FIELD_CANNOT_BE_EXCLUDED);
      }
      field.unset();
    }
    return this;
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
