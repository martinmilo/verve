import type { ModelConstructor, ModelSchema, StrictPartial } from "../core/types";

import { WithContext } from "../../context";
import { WithAuthorization } from "../../authorization";
import { FieldInitializer } from "../initializers/FieldInitializer";
import { ValidationInitializer } from "./ValidationInitializer";
import { getBaseModelMethods } from "../core/utils";
import { ValueInitializer } from "./ValueInitializer";
import { ErrorCode, VerveError } from "../../errors";
import { BoundField, Field } from "../../field";
import { Model } from "../core/Model";

import {
  MODEL_CHANGE_LOG,
  MODEL_CONSTRUCTOR,
  MODEL_FIELDS,
  MODEL_INITIAL_STATE,
  MODEL_INITIALIZER,
  MODEL_PROXY,
  MODEL_STATE
} from "../../constants";

export const DEFAULT_OBJECT_PROPS = { writable: false, enumerable: false, configurable: false };

export function createModelClass<S = any>() {
  return class extends WithContext(WithAuthorization(Model<S>)) {
    protected constructor(internal?: symbol) {
      if (internal !== MODEL_CONSTRUCTOR) {
        throw new VerveError(ErrorCode.DIRECT_INSTANTIATION_NOT_ALLOWED);
      }
      super();
    }

    static make<C extends new (...args: any[]) => any>(
      this: C & { schema: any },
      data: StrictPartial<S>
    ) {
      const instance = new this(MODEL_CONSTRUCTOR) as InstanceType<C>;
      instance[MODEL_INITIALIZER]('make');
      
      // 1. Initialize field instances on the model
      FieldInitializer.initialize(instance, this.schema);
      // 2. Initialize field values on the model (i.e. save on model state and as object property)
      ValueInitializer.initialize(instance, data, { isHydrating: false });
      
      // 3. Create fields proxy
      const proxy = createFieldsProxy(instance, this.schema);
      instance[MODEL_PROXY](proxy);
      
      // 4. Validate field values
      ValidationInitializer.initialize(instance, this.schema);
      // 5. Record initial changes
      for (const key in instance[MODEL_STATE]()) {
        instance[MODEL_CHANGE_LOG]({
          field: key,
          currentValue: instance[MODEL_STATE]()[key],
          previousValue: undefined,
          timestamp: new Date(),
        });
      }
      return proxy;
    }

    static from<C extends new (...args: any[]) => any>(
      this: C & { schema: any },
      data: StrictPartial<S>
    ) {
      const instance = new this(MODEL_CONSTRUCTOR) as InstanceType<C>;
      instance[MODEL_INITIALIZER]('from');
      
      // 1. Initialize field instances on the model
      FieldInitializer.initialize(instance, this.schema);
      // 2. Initialize field values on the model (i.e. save on model state and as object property)
      ValueInitializer.initialize(instance, data, { isHydrating: true });
      
      // 3. Create fields proxy
      const proxy = createFieldsProxy(instance, this.schema);
      instance[MODEL_PROXY](proxy);
      
      // 4. Validate field values
      ValidationInitializer.initialize(instance, this.schema);
      // 5. Set initial state (we need to make a copy of the state to avoid mutating the original state)
      instance[MODEL_INITIAL_STATE]({ ...instance[MODEL_STATE]() });
      return proxy;
    }
  } as unknown as ModelConstructor<S>;
}

function createFieldsProxy<S extends ModelSchema>(instance: Model<S>, schema: S) {
  const fields = instance[MODEL_FIELDS]();
  const baseModelMethods = getBaseModelMethods(Model);
  
  const recordChange = (fieldInstance: BoundField<Field<any>>, newValue: any) => {
    fieldInstance.set(newValue);
  }

  return new Proxy(instance, {
    get(target, key: string, receiver) {
      if (Object.prototype.hasOwnProperty.call(schema, key)) {
        const field = fields[key];

        if (field.options.compute) {
          return field.compute();
        }

        const fieldValue = field.get();

        // Wrap objects and arrays in nested proxies to track and log state changes
        if (isArrayOrObject(fieldValue)) {
          return createNestedProxy({
            key,
            value: fieldValue,
            instance: field,
            recordChange: recordChange.bind(null, field)
          });
        }
        return fieldValue;
      }
      
      const value = Reflect.get(target, key, receiver);
      // We need to bind the method to the original target to preserve private field access
      // But we only do so for the methods of the base model class, since these access private fields
      // Example: user.isNew() should return the original target's isNew method
      if (typeof value === 'function' && baseModelMethods.has(key)) {
        return value.bind(target);
      }
      return value;
    },

    set(target, key: string, value: any, receiver) {
      if (Object.prototype.hasOwnProperty.call(schema, key)) {
        const field = fields[key];

        if (field.options.compute) {
          throw new VerveError(ErrorCode.FIELD_IS_COMPUTED, { field: key, model: field.metadata.model });
        }

        if (!field.isWritable()) {
          throw new VerveError(ErrorCode.FIELD_NOT_WRITABLE, { field: key, model: field.metadata.model });
        }

        recordChange(field, value);
        return true;
      }
      return Reflect.set(target, key, value, receiver);
    },
  });
}

function createNestedProxy(field: {
  key: string,
  value: any,
  instance: BoundField<Field<any>>,
  recordChange: (newValue: any) => void,
}) {
  if (!isArrayOrObject(field.value)) {
    return field.value;
  }
  return Array.isArray(field.value) ? createArrayProxy(field) : createObjectProxy(field);
}

function createArrayProxy(
  field: {
    key: string,
    value: any[],
    instance: BoundField<Field<any>>,
    recordChange: (newValue: any) => void,
  },
): any[] {
  return new Proxy(field.value, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // For array methods that might mutate, wrap them to record changes AFTER they execute
      if (typeof value === 'function' && typeof prop === 'string') {
        const originalMethod = value;
        return function(...args: any[]) {
          const result = originalMethod.apply(target, args);

          // Only record change if the method actually mutated the array
          // We can check this by seeing if the method is a known mutating method
          const mutatingMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin'];
          if (mutatingMethods.includes(prop)) {
            field.recordChange(target);
          }
          return result;
        };
      }

      if (isArrayOrObject(value)) {
        return createNestedProxy(field);
      }
      return value;
    },

    set(target, prop, value, receiver) {
      const result = Reflect.set(target, prop, value, receiver);
      
      if (result) {
        field.recordChange(target);
      }
      return result;
    }
  });
}

function createObjectProxy(
  field: {
    key: string,
    value: object,
    instance: BoundField<Field<any>>,
    recordChange: (newValue: any) => void,
  },
): object {
  return new Proxy(field.value, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      
      if (isArrayOrObject(value)) {
        return createNestedProxy(field);
      }
      return value;
    },

    set(target, prop, value, receiver) {
      const result = Reflect.set(target, prop, value, receiver);

      if (result) {
        field.recordChange(target);
      }
      return result;
    }
  });
}

function isArrayOrObject(value: any): boolean {
  if (value instanceof Model) {
    return false;
  }
  if (value instanceof Date) {
    return false;
  }
  return typeof value === 'object' && value !== null;
}