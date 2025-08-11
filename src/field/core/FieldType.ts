import { Field } from "./Field";
import { VerveError, ErrorCode } from "../../errors";

const DEFAULT_FIELD_TYPES: Record<string, (value: any) => boolean> = {
  IdField: (value: string) => typeof value === 'string',
  BoolField: (value: boolean) => typeof value === 'boolean',
  TextField: (value: string) => typeof value === 'string',
  NumberField: (value: number) => typeof value === 'number',
  DateField: (value: Date) => value instanceof Date,
  ListField: (value: any[]) => Array.isArray(value),
  RecordField: (value: Record<string, any>) => typeof value === 'object' && !Array.isArray(value),
  OptionField: (value: string) => typeof value === 'string',
};

export class FieldType {
  static validate(field: Field<any>, value: any): void {
    const params = { field: field.metadata.name, model: field.metadata.model };

    if (value === null) {
      if (field.options.nullable) {
        return;
      }
      throw new VerveError(ErrorCode.FIELD_NOT_NULLABLE, params);
    }

    const isValidType = DEFAULT_FIELD_TYPES[field.constructor.name](value);
    if (!isValidType) {
      throw new VerveError(ErrorCode.FIELD_TYPE_MISMATCH, params);
    }
  }
}