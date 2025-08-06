import type { ModelSchema } from '../core/types';

import { BUILDER_TARGET_TYPE, FIELD_MODEL, FIELD_NAME } from '../../constants';
import { FieldBuilder } from '../../field/builder/FieldBuilder';
import { AssociationRegistry } from '../../association';

export function model<S extends ModelSchema>(schema: S) {
  return function <T extends new (...args: any[]) => any>(constructor: T): void {
    const sourceModel = constructor.name;

    (constructor as any).schema = schema;
    (constructor as any).modelName = sourceModel;

    for (const [key, field] of Object.entries(schema)) {
      const fieldName = key;
      
      if (field instanceof FieldBuilder) {
        const targetModel = (field as any)[BUILDER_TARGET_TYPE];
        
        (field as any)[FIELD_NAME] = fieldName;
        (field as any)[FIELD_MODEL] = sourceModel;
        
        if (field.options.associate) {
          const associate = field.options.associate;
          if (!associate) {
            return;
          }

          if (targetModel) {
            AssociationRegistry.register({
              sourceModel,
              sourcePath: associate.to,
              fieldName,
              targetModel,
              targetPath: associate.from,
            });
          }
        }
      }
    }
  };
}
