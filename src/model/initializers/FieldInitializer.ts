import type { ModelSchema, ModelInstance, ModelFields } from "../core/types";

import { MODEL_FIELDS } from "../../constants";
import { Field, BoundField } from '../../field';
import { makeFieldInstanceKey } from "../core/utils";
import { Model } from "../core/Model";

const DEFAULT_OBJECT_PROPS = { writable: false, enumerable: false, configurable: false };

export class FieldInitializer {
  static initialize<S extends ModelSchema>(model: Model<S> & ModelInstance, schema: S) {
    const schemaEntries = Object.entries(schema);

    // Initialize fields and it's instances based on schema
    for (const [fieldName, fieldDef] of schemaEntries) {
      const fieldInstance = fieldDef.toField(model);
      this.initializeField(model, fieldName, fieldInstance);
    }
  }

  private static initializeField<S extends ModelSchema>(
    model: Model<S> & ModelInstance,
    fieldName: string,
    fieldInstance: Field<any>,
  ) {
    const fieldInstanceKey = makeFieldInstanceKey(fieldName) as keyof ModelFields<S>;
    const fields = model[MODEL_FIELDS]()

    // Skip if field instance key already exists on the model instance
    // Note: The field instance doesn't hold any state, so there's no need to re-bind it
    if (Object.prototype.hasOwnProperty.call(fields, fieldInstanceKey)) {
      return;
    }

    // Set static field name property
    Object.defineProperty(model.constructor, fieldName, { ...DEFAULT_OBJECT_PROPS, value: fieldName });

    // Bind field instance and set it on the model instance
    // Even when the field is undefined, we want to initialize field to be able to access it's methods
    const boundField = BoundField.toBoundField(model, fieldName, fieldInstance) as ModelFields<S>[`$${string & typeof fieldName}`];

    Object.defineProperty(model, fieldInstanceKey, { ...DEFAULT_OBJECT_PROPS, value: boundField });
    fields[fieldInstanceKey] = boundField;
  }
}