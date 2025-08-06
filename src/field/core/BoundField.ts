import type { FieldMetadata, FieldOptions } from "./types";
import type { ModelInstance } from "../../model/core/types";

import { BOUND_FIELD_METADATA, BOUND_FIELD_OPTIONS } from "../../constants";
import { VerveErrorList } from "../../errors";
import { Field } from "./Field";

export interface BoundField<T> {
  get(): T;
  unsafeGet(): T | undefined;
  set(value: T): void;
  unset(): void;
  is(value: T): boolean;
  isEmpty(): boolean;
  isPresent(): boolean;
  isValid(): boolean;
  generate(): void;
  compute(): T;
  validate(): VerveErrorList;
  isReadable(): boolean;
  isWritable(): boolean;
  [BOUND_FIELD_METADATA]: FieldMetadata;
  [BOUND_FIELD_OPTIONS]: FieldOptions;
}

export abstract class BoundField<T> {
  constructor(public metadata: FieldMetadata, public options: FieldOptions = {}) {}

  static toBoundField<T>(model: ModelInstance, fieldName: string, field: Field<T>): BoundField<T> {
    const boundField = Object.create(field);

    boundField.get = () => field.get(model, fieldName);
    boundField.unsafeGet = () => field.unsafeGet(model, fieldName);
    boundField.set = (value: any) => field.set(model, fieldName, value);
    boundField.unset = () => field.unset(model, fieldName);
    boundField.is = (value: any) => field.is(model, fieldName, value);
    boundField.isEmpty = () => field.isEmpty(model, fieldName);
    boundField.isPresent = () => field.isPresent(model, fieldName);
    boundField.isValid = () => field.isValid(model, fieldName);
    boundField.validate = () => field.validate(model, fieldName);
    boundField.generate = () => field.generate(model, fieldName);
    boundField.compute = () => field.compute(model, fieldName);
    boundField.isReadable = () => field.isReadable(model, fieldName);
    boundField.isWritable = () => field.isWritable(model, fieldName);

    boundField[BOUND_FIELD_METADATA] = field.metadata;
    boundField[BOUND_FIELD_OPTIONS] = field.options;

    return boundField;
  }
}
