interface Association {
  sourceModel: string;
  sourcePath: string;
  fieldName: string;
  targetModel: string;
  targetPath: string;
}

type ValidatorFn = (source: any, target: any) => boolean;

function resolvePath(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export class AssociationRegistry {
  private static associations: Array<Association> = [];
  private static validators: Record<string, ValidatorFn> = {};

  static register(association: Association): void {
    this.associations.push(association);

    const {
      sourceModel,
      fieldName,
      sourcePath,
      targetPath,
    } = association;

    const key = `${sourceModel}.${fieldName}`;

    
    const validator: ValidatorFn = (sourceModelInstance, targetModelInstance) => {
      const sourceVal = resolvePath(sourceModelInstance, sourcePath);
      const targetVal = resolvePath(targetModelInstance, targetPath);
      return sourceVal === targetVal;
    };

    this.validators[key] = validator;
  }

  static getValidator(sourceModel: string, fieldName: string): ValidatorFn | undefined {
    return this.validators[`${sourceModel}.${fieldName}`];
  }

  static allValidators(): Record<string, ValidatorFn> {
    return { ...this.validators };
  }

  static allAssociations(): Association[] {
    return [...this.associations];
  }
}