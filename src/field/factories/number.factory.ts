import { composeFieldBuilder } from "../builder/compose";
import { FieldBuilder } from "../builder/FieldBuilder";
import { NumberField } from "../fields/NumberField";

import { WithNullable, type WithNullableProp } from "../builder/mixins/WithNullable";
import { WithReadable, type WithReadableFunc } from "../builder/mixins/WithReadable";
import { WithWritable, type WithWritableFunc } from "../builder/mixins/WithWritable";
import { WithDefault, type WithDefaultFunc } from "../builder/mixins/WithDefault";
import { WithGenerate, type WithGenerateFunc } from "../builder/mixins/WithGenerate";
import { WithValidate, type WithValidateFunc } from "../builder/mixins/WithValidate";
import { WithCompute, type WithComputeFunc } from "../builder/mixins/WithCompute";

export interface NumberFieldBuilder extends FieldBuilder<number> {
  nullable: WithNullableProp<this>;
  readable: WithReadableFunc<this>;
  writable: WithWritableFunc<this>;
  default: WithDefaultFunc<this, number>;
  generate: WithGenerateFunc<this, number>;
  compute: WithComputeFunc<this>;
  validate: WithValidateFunc<this>;
}

const EnhancedBuilder = composeFieldBuilder<NumberFieldBuilder>(FieldBuilder<number>, [
  WithNullable,
  WithReadable,
  WithWritable,
  WithDefault,
  WithGenerate,
  WithCompute,
  WithValidate,
]);

export function number(): NumberFieldBuilder {
  return new EnhancedBuilder(NumberField);
}