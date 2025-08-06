import type { ModelInstance, ModelSchema } from "../core/types";

import { BOUND_FIELD_METADATA, BOUND_FIELD_OPTIONS, MODEL_FIELDS } from "../../constants";
import { AssociationRegistry } from "../../association";
import { makeFieldInstanceKey } from "../core/utils";
import { ErrorCode, VerveError, VerveErrorList } from "../../errors";
import { BoundField, Field } from "../../field";
import { Model } from "../core/Model";

export class ValidationInitializer {
  static initialize<S extends ModelSchema>(model: Model<S> & ModelInstance, schema: S) {
    const fields = model[MODEL_FIELDS]();
    const errors = VerveErrorList.new();

    let modelName;

    for (const fieldName of Object.keys(schema)) {
      const instanceKey = makeFieldInstanceKey(fieldName);
      const field = fields[instanceKey];
      const value = field.unsafeGet();

      if (!modelName) {
        modelName = field.metadata.model;
      }

      // Skip validation for uninitialized fields
      if (value === undefined) {
        continue;
      }

      // Validate field value
      errors.merge(validateField(model, fieldName, field));

      // Set writable and enumerable to true to allow serialization
      Object.defineProperty(model, fieldName, {
        value,
        writable: field.isWritable(),
        enumerable: field.isReadable(),
        configurable: true,
      });
    }

    if (errors.isPresent()) {
      throw new VerveError(ErrorCode.MODEL_FIELD_VALIDATION_FAILED, {
        model: modelName,
        errors: errors.toErrorMessagesWithCode().join('\n'),
      });
    }
  }
}

function validateField(model: Model<any>, fieldName: string, fieldInstance: BoundField<any>): VerveErrorList {
  const errors = VerveErrorList.new();

  const fieldMetadata = fieldInstance[BOUND_FIELD_METADATA];
  const fieldOptions = fieldInstance[BOUND_FIELD_OPTIONS];
  const fieldValue = fieldInstance.unsafeGet();

  // We skip validation for uninitialized fields
  if (fieldValue === undefined) {
    return errors;
  }

  // Throw if field is not nullable and value is null
  if (fieldValue === null && !fieldOptions.nullable) {
    errors.add(ErrorCode.FIELD_NOT_NULLABLE, {
      field: fieldName,
      model: fieldMetadata.model,
    });
  }

  // Validate associations
  if (fieldOptions.associate) {
    errors.merge(validateAssociation(model, fieldMetadata.model, fieldName, fieldValue));
  }

  // Validate the field value based on the provided eager validators
  const eagerValidators = Field.getEagerValidators(fieldOptions);

  for (const validator of eagerValidators) {
    const result = validator(fieldValue);
    const validatorName = validator.name || 'anonymous';

    if (result !== true) {
      errors.add(ErrorCode.FIELD_VALIDATOR_FAILED, {
        field: fieldName,
        validator: validatorName,
        model: fieldMetadata.model,
      });
    }
  }

  return errors;
}

function validateAssociation<T>(model: Model<any>, modelName: string, fieldName: string, fieldValue: T): VerveErrorList {
  const errors = VerveErrorList.new();

  const isLoaded = (value: any) => value.id !== undefined && Object.keys(value).length > 1;

  const validator = AssociationRegistry.getValidator(modelName, fieldName);
  if (!validator) {
    errors.add(ErrorCode.ASSOCIATION_VALIDATOR_NOT_FOUND, {
      field: fieldName,
      model: modelName,
    });
    return errors;
  }

  const values = Array.isArray(fieldValue) ? fieldValue : [fieldValue];

  for (const value of values) {
    if (!isLoaded(value)) {
      continue;
    }

    if (!validator(model, value)) {
      errors.add(ErrorCode.ASSOCIATION_INVALID, {
        field: fieldName,
        model: modelName,
        value: JSON.stringify(value),
      });
    }
  }

  return errors;
}