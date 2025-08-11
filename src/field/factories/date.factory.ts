import { composeFieldBuilder } from "../builder/compose";
import { FieldBuilder } from "../builder/FieldBuilder";
import { DateField } from "../fields/DateField";

import { WithNullable, type WithNullableProp } from "../builder/mixins/WithNullable";
import { WithReadable, type WithReadableFunc } from "../builder/mixins/WithReadable";
import { WithWritable, type WithWritableFunc } from "../builder/mixins/WithWritable";
import { WithGenerate, type WithGenerateFunc } from "../builder/mixins/WithGenerate";
import { WithValidate, type WithValidateFunc } from "../builder/mixins/WithValidate";

export interface DateFieldBuilder extends FieldBuilder<Date> {
  nullable: WithNullableProp<this>;
  readable: WithReadableFunc<this>;
  writable: WithWritableFunc<this>;
  generate: WithGenerateFunc<this, Date>;
  validate: WithValidateFunc<this>;
}

const EnhancedBuilder = composeFieldBuilder<DateFieldBuilder>(FieldBuilder<Date>, [
  WithNullable,
  WithReadable,
  WithWritable,
  WithGenerate,
  WithValidate,
]);

export function date(): DateFieldBuilder {
  return new EnhancedBuilder(DateField);
}