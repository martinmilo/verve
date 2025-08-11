import type { ModelSchema, ModelInstance } from "../core/types";

import { MODEL_FIELDS } from "../../constants";
import { BoundField } from '../../field';
import { Model } from "../core/Model";

export class FieldInitializer {
  static initialize<S extends ModelSchema>(model: Model<S> & ModelInstance, schema: S) {
    const schemaEntries = Object.entries(schema);

    const fields = model[MODEL_FIELDS]()

    // Initialize fields and it's instances based on schema
    for (const [fieldName, fieldDef] of schemaEntries) {
      const fieldInstance = fieldDef.toField(model);

      // Skip if field instance key already exists on the model instance
      // Note: The field instance itself doesn't hold any state, so there's no need to re-bind it
      if (fields[fieldName]) {
        continue;
      }

      // Bind field instance and set it on the model instance
      // Even when the field is undefined, we want to initialize field to be able to access it's methods
      const boundField = BoundField.toBoundField(model, fieldName, fieldInstance);
      (fields as any)[fieldName] = boundField;
    }
  }
}