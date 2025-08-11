import type { ModelSchema } from '../core/types';

import { FIELD_MODEL, FIELD_NAME } from '../../constants';
import { FieldBuilder } from '../../field/builder/FieldBuilder';

export function model<S extends ModelSchema>(schema: S) {
  return function <T extends new (...args: any[]) => any>(constructor: T): void {
    const sourceModel = constructor.name;

    (constructor as any).schema = schema;
    (constructor as any).modelName = sourceModel;

    for (const [key, field] of Object.entries(schema)) {
      const fieldName = key;
      
      if (field instanceof FieldBuilder) {
        (field as any)[FIELD_NAME] = fieldName;
        (field as any)[FIELD_MODEL] = sourceModel;
      }
    }
  };
}
