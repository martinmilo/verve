import type { ModelInstance } from "../../model/core/types";

import { composeFieldBuilder } from "../builder/compose";
import { FieldBuilder } from "../builder/FieldBuilder";
import { IdField } from "../fields/IdField";

import { WithValidate, type WithValidateFunc } from "../builder/mixins/WithValidate";
import { WithGenerate, type WithGenerateFunc } from "../builder/mixins/WithGenerate";

export interface IdFieldBuilder extends FieldBuilder<string> {
  validate: WithValidateFunc<this>;
  generate: WithGenerateFunc<this, string>;
}

const EnhancedBuilder = composeFieldBuilder<IdFieldBuilder>(FieldBuilder<string>, [WithGenerate, WithValidate]);

export function isIdWritable(_: any, model: ModelInstance) {
  return model.isNew();
}

export function id(): IdFieldBuilder {
  const builder = new EnhancedBuilder(IdField);
  builder.setOption('writable', isIdWritable);
  return builder;
}