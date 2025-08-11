import { composeFieldBuilder } from "../builder/compose";
import { FieldBuilder } from "../builder/FieldBuilder";
import { TextField } from "../fields/TextField";

import { WithNullable, type WithNullableProp } from "../builder/mixins/WithNullable";
import { WithReadable, type WithReadableFunc } from "../builder/mixins/WithReadable";
import { WithWritable, type WithWritableFunc } from "../builder/mixins/WithWritable";
import { WithDefault, type WithDefaultFunc } from "../builder/mixins/WithDefault";
import { WithGenerate, type WithGenerateFunc } from "../builder/mixins/WithGenerate";
import { WithValidate, type WithValidateFunc } from "../builder/mixins/WithValidate";

export interface TextFieldBuilder extends FieldBuilder<string> {
  nullable: WithNullableProp<this>;
  readable: WithReadableFunc<this>;
  writable: WithWritableFunc<this>;
  default: WithDefaultFunc<this, string>;
  generate: WithGenerateFunc<this, string>;
  validate: WithValidateFunc<this>;
}

const EnhancedBuilder = composeFieldBuilder<TextFieldBuilder>(FieldBuilder<string>, [
  WithNullable,
  WithReadable,
  WithWritable,
  WithDefault,
  WithGenerate,
  WithValidate,
]);

export function text(): TextFieldBuilder {
  return new EnhancedBuilder(TextField);
}