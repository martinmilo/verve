import type { ModelInstance, ModelSchema } from "../core/types";
import type { FieldOptions } from "../../field/core/types";

import { Model } from "../core/Model";
import { Field } from "../../field";
import { MODEL_FIELDS, MODEL_STATE } from "../../constants";

export class ValueInitializer {
  static initialize<S extends ModelSchema>(
    model: Model<S> & ModelInstance,
    data: any = {},
    params: { isHydrating: boolean } = { isHydrating: false }
  ) {
    const fields = model[MODEL_FIELDS]();

    for (const [fieldKey, field] of Object.entries(fields)) {
      const fieldName = fieldKey.replace('$', '');

      // Skip if field is computed
      if (field.options.compute) {
        continue;
      }

      const initialValue = this.getInitialValue(data[fieldName as keyof typeof data], {
        ...field.options,
        isHydrating: params.isHydrating
      });
      
      // Skip if value is undefined, we don't set uninitialized values on the model instance
      if (initialValue === undefined) {
        continue;
      }

      // Set value on the model state
      const state = model[MODEL_STATE]();
      (state as any)[fieldName] = initialValue;

      // Temporarily set values on model with readable/writable as true until they get validated
      Object.defineProperty(model, fieldName, {
        value: initialValue,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
  }

  private static getInitialValue(value: any, options: FieldOptions & { isHydrating: boolean }) {
    if (value !== undefined) {
      return value;
    }
    // If we are hydrating, we don't want to set any values
    // Example: We're instantiating a model with "from" method, we don't want to generate any values
    if (options.isHydrating) {
      return undefined;
    }
    // Creating new instance with either default or generated (if eager) value
    // Prefer default value over generated value
    if (options.default) {
      return options.default;
    }
    // If we have an eager generator, we want to generate a value
    const eagerGenerator = Field.getEagerGenerator(options);
    if (eagerGenerator) {
      return eagerGenerator();
    }
    return undefined;
  }
}