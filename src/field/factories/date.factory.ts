import { composeFieldBuilder } from "../builder/compose";
import { FieldBuilder } from "../builder/FieldBuilder";
import { DateField } from "../fields/DateField";

import { WithNullable, type WithNullableProp } from "../builder/mixins/WithNullable";
import { WithReadable, type WithReadableFunc } from "../builder/mixins/WithReadable";
import { WithWritable, type WithWritableFunc } from "../builder/mixins/WithWritable";
import { WithGenerate, type WithGenerateFunc } from "../builder/mixins/WithGenerate";
import { WithValidate, type WithValidateFunc } from "../builder/mixins/WithValidate";
import { WithCompute, type WithComputeFunc } from "../builder/mixins/WithCompute";

export interface DateFieldBuilder extends FieldBuilder<Date> {
  nullable: WithNullableProp<this>;
  readable: WithReadableFunc<this>;
  writable: WithWritableFunc<this>;
  generate: WithGenerateFunc<this, Date>;
  compute: WithComputeFunc<this>;
  validate: WithValidateFunc<this>;
}

const EnhancedBuilder = composeFieldBuilder<DateFieldBuilder>(FieldBuilder<Date>, [
  WithNullable,
  WithReadable,
  WithWritable,
  WithGenerate,
  WithCompute,
  WithValidate,
]);

export function date(): DateFieldBuilder {
  return new EnhancedBuilder(DateField);
}