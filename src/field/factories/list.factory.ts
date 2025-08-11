import { composeFieldBuilder } from "../builder/compose";
import { FieldBuilder } from "../builder/FieldBuilder";
import { ListField } from "../fields/ListField";

import { WithNullable, type WithNullableProp } from "../builder/mixins/WithNullable";
import { WithReadable, type WithReadableFunc } from "../builder/mixins/WithReadable";
import { WithWritable, type WithWritableFunc } from "../builder/mixins/WithWritable";
import { WithDefault, type WithDefaultFunc } from "../builder/mixins/WithDefault";
import { WithGenerate, type WithGenerateFunc } from "../builder/mixins/WithGenerate";
import { WithValidate, type WithValidateFunc } from "../builder/mixins/WithValidate";

export interface ListFieldBuilder<T> extends FieldBuilder<T[]> {
  nullable: WithNullableProp<this>;
  readable: WithReadableFunc<this>;
  writable: WithWritableFunc<this>;
  default: WithDefaultFunc<this, T[]>;
  generate: WithGenerateFunc<this, T[]>;
  validate: WithValidateFunc<this>;
}

const EnhancedBuilder = composeFieldBuilder(FieldBuilder<any[]>, [
  WithNullable,
  WithReadable,
  WithWritable,
  WithDefault,
  WithGenerate,
  WithValidate,
]);

export function list<T = any>(): ListFieldBuilder<T> {
  return new EnhancedBuilder(ListField) as unknown as ListFieldBuilder<T>;
}