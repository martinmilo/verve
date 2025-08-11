import { composeFieldBuilder } from "../builder/compose";
import { FieldBuilder } from "../builder/FieldBuilder";
import { OptionField } from "../fields/OptionField";

import { WithNullable, type WithNullableProp } from "../builder/mixins/WithNullable";
import { WithReadable, type WithReadableFunc } from "../builder/mixins/WithReadable";
import { WithWritable, type WithWritableFunc } from "../builder/mixins/WithWritable";
import { WithDefault, type WithDefaultFunc } from "../builder/mixins/WithDefault";
import { WithValidate, type WithValidateFunc } from "../builder/mixins/WithValidate";

export interface OptionFieldBuilder<T> extends FieldBuilder<T> {
  nullable: WithNullableProp<this>;
  readable: WithReadableFunc<this>;
  writable: WithWritableFunc<this>;
  default: WithDefaultFunc<this, T>;
  validate: WithValidateFunc<this>;
}

const EnhancedBuilder = composeFieldBuilder(FieldBuilder<string>, [
  WithNullable,
  WithReadable,
  WithWritable,
  WithDefault,
  WithValidate,
]);

export function option<T = any>(valuesOrEnum: readonly T[] | Record<string, T>): OptionFieldBuilder<T> {
  const values = Array.isArray(valuesOrEnum) ? valuesOrEnum : Object.values(valuesOrEnum);
  const builder = new EnhancedBuilder(OptionField) as unknown as OptionFieldBuilder<T>;
  const isOneOfValues = (value: any): value is T => values.includes(value);
  builder.validate.add(isOneOfValues);
  return builder;
}
