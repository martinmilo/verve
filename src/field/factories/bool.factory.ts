import { composeFieldBuilder } from "../builder/compose";
import { FieldBuilder } from "../builder/FieldBuilder";
import { BoolField } from "../fields/BoolField";

import { WithNullable, WithNullableProp } from "../builder/mixins/WithNullable";
import { WithReadable, WithReadableFunc } from "../builder/mixins/WithReadable";
import { WithWritable, WithWritableFunc } from "../builder/mixins/WithWritable";
import { WithDefault, WithDefaultFunc } from "../builder/mixins/WithDefault";
import { WithValidate, WithValidateFunc } from "../builder/mixins/WithValidate";
import { WithCompute, type WithComputeFunc } from "../builder/mixins/WithCompute";

export interface BoolFieldBuilder extends FieldBuilder<boolean> {
  nullable: WithNullableProp<this>;
  readable: WithReadableFunc<this>;
  writable: WithWritableFunc<this>;
  default: WithDefaultFunc<this, boolean>;
  compute: WithComputeFunc<this>;
  validate: WithValidateFunc<this>;
}

const EnhancedBuilder = composeFieldBuilder<BoolFieldBuilder>(FieldBuilder<boolean>, [
  WithNullable,
  WithReadable,
  WithWritable,
  WithDefault,
  WithCompute,
  WithValidate,
]);

export function bool(): BoolFieldBuilder {
  return new EnhancedBuilder(BoolField);
}