import type { FieldMetadata, FieldOptions, FieldValidator, FieldGenerator } from "./types";
import type { ModelInstance } from "../../model/core/types";

import { MODEL_CHANGE_LOG, MODEL_STATE } from "../../constants";
import { isArrayEqual, isObjectEqual } from "./utils";
import { isEagerFieldGenerator } from "../utils/generator";
import { isEagerFieldValidator } from "../utils/validator";
import { ErrorCode, VerveError, VerveErrorList } from "../../errors";

export abstract class Field<T> {
  constructor(public metadata: FieldMetadata, public options: FieldOptions = {}) {}

  protected static globalValidatorsMap = new Map<Function, FieldValidator[]>();
  protected static globalGeneratorsMap = new Map<Function, FieldGenerator>();

  static setGlobalValidators(validators: FieldValidator[]): void {
    Field.globalValidatorsMap.set(this, validators);
  }

  static getGlobalValidators(): FieldValidator[] {
    return this.globalValidatorsMap.get(this) ?? [];
  }

  static getGlobalGenerator(): FieldGenerator | undefined {
    return this.globalGeneratorsMap.get(this) ?? undefined;
  }

  static getEagerGenerator(options: FieldOptions): FieldGenerator | undefined {
    if (options.generator && isEagerFieldGenerator(options.generator)) {
      return options.generator;
    }
    return undefined;
  }

  static getEagerValidators(options: FieldOptions): FieldValidator[] {
    return options.validators?.filter(isEagerFieldValidator) ?? [];
  }

  get(model: ModelInstance, key: string): T {
    const state = model[MODEL_STATE]();

    if (!this.isReadable(model, key)) {
      throw new VerveError(ErrorCode.FIELD_NOT_READABLE, { field: key, model: this.metadata.model });
    }

    const value = state[key];
    if (value === undefined) {
      throw new VerveError(ErrorCode.FIELD_NOT_INITIALIZED, { field: key, model: this.metadata.model });
    }

    const errors = this.validate(model, key);
    if (errors.isPresent()) {
      throw new VerveError(ErrorCode.FIELD_VALIDATORS_FAILED, {
        field: key,
        model: this.metadata.model,
        errors: errors.toErrorMessagesWithCode().join('\n'),
      });
    }

    return value;
  }

  unsafeGet(model: ModelInstance, key: string): T | undefined {
    const state = model[MODEL_STATE]();
    return state[key];
  }

  set(model: ModelInstance, key: string, value: T): void {
    const state = model[MODEL_STATE]();

    if (!this.isWritable(model, key)) {
      throw new VerveError(ErrorCode.FIELD_NOT_WRITABLE, { field: key, model: this.metadata.model });
    }

    if (value === null && !this.options.nullable) {
      throw new VerveError(ErrorCode.FIELD_NOT_NULLABLE, { field: key, model: this.metadata.model });
    }

    try {
      model[MODEL_CHANGE_LOG]({
        field: key,
        currentValue: value,
        previousValue: state[key],
        timestamp: new Date(),
      });
  
      state[key] = value;
      Object.assign(model, { [key]: value });
    } catch (error) {
      throw new VerveError(ErrorCode.FIELD_SET_ERROR, {
        field: key,
        model: this.metadata.model,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  unset(model: ModelInstance, key: string): void {
    const state = model[MODEL_STATE]();

    try {
      model[MODEL_CHANGE_LOG]({
        field: key,
        currentValue: undefined,
        previousValue: state[key],
        timestamp: new Date(),
      });
  
      delete state[key];
      delete (model as any)[key];
    } catch (error) {
      throw new VerveError(ErrorCode.FIELD_UNSET_ERROR, {
        field: key,
        model: this.metadata.model,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  is(model: ModelInstance, key: string, value: T): boolean {
    const currentValue = this.unsafeGet(model, key);

    if (typeof currentValue !== typeof value) {
      return false;
    }

    if (Array.isArray(currentValue) && Array.isArray(value)) {
      return isArrayEqual(currentValue, value);
    }

    if (typeof currentValue === 'object' && typeof value === 'object') {
      return isObjectEqual(currentValue, value);
    }

    return currentValue === value;
  }

  isEmpty(model: ModelInstance, key: string): boolean {
    const value = this.unsafeGet(model, key);

    if (value === undefined || value === null) {
      return true;
    }
    if (typeof value === 'string') {
      return value.trim().length === 0;
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    if (typeof value === 'object') {
      return Object.keys(value).length === 0;
    }
    return false;
  }

  isPresent(model: ModelInstance, key: string): boolean {
    return !this.isEmpty(model, key);
  }

  isValid(model: ModelInstance, key: string): boolean {
    const value = this.unsafeGet(model, key);
    const validators = this.options.validators || [];

    return validators.every((validator) => validator(value));
  }

  generate(model: ModelInstance, key: string): void {
    const generator = this.options.generator;
    if (!generator) {
      throw new VerveError(ErrorCode.FIELD_NO_GENERATOR, { field: key, model: this.metadata.model });
    }
    const value = this.unsafeGet(model, key);
    if (value) {
      throw new VerveError(ErrorCode.FIELD_ALREADY_GENERATED, { field: key, model: this.metadata.model });
    }
    if (model.isExisting()) {
      throw new VerveError(ErrorCode.FIELD_CANNOT_GENERATE_EXISTING, { field: key, model: this.metadata.model });
    }
    this.set(model, key, generator());
  }

  compute(model: ModelInstance, key: string): T {
    const compute = this.options.compute;
    if (!compute) {
      throw new VerveError(ErrorCode.FIELD_NO_COMPUTE, { field: key, model: this.metadata.model });
    }
    this.set(model, key, compute(model));
    return this.get(model, key);
  }

  validate(model: ModelInstance, key: string): VerveErrorList {
    const value = this.unsafeGet(model, key);
    const validators = this.options.validators || [];

    const errors = VerveErrorList.new();
    
    if (value === undefined) {
      return errors;
    }

    for (const validator of validators) {
      const result = validator(value, model);

      if (result !== true) {
        errors.add(ErrorCode.FIELD_VALIDATOR_FAILED, {
          field: key,
          validator: validator.name || 'anonymous',
          model: this.metadata.model,
        });
      }
    }
    return errors;
  }

  isReadable(model: ModelInstance, key: string): boolean {
    const value = this.unsafeGet(model, key);

    if (typeof this.options.readable === 'function') {
      try {
        return this.options.readable(model.getContext(), model, value);
      } catch (_) {
        return false;
      }
    }
    return this.options.readable ?? true;
  }
  
  isWritable(model: ModelInstance, key: string): boolean {
    const value = this.unsafeGet(model, key);
    
    if (typeof this.options.writable === 'function') {
      try {
        return this.options.writable(model.getContext(), model, value);
      } catch (_) {
        return false;
      }
    }
    return this.options.writable ?? true;
  }
}
