import { composeFieldBuilder } from "../builder/compose";
import { FieldBuilder } from "../builder/FieldBuilder";
import { ListField } from "../fields/ListField";
import { BUILDER_TARGET_TYPE } from "../../constants";

import { WithNullable, type WithNullableProp } from "../builder/mixins/WithNullable";
import { WithReadable, type WithReadableFunc } from "../builder/mixins/WithReadable";
import { WithWritable, type WithWritableFunc } from "../builder/mixins/WithWritable";
import { WithDefault, type WithDefaultFunc } from "../builder/mixins/WithDefault";
import { WithGenerate, type WithGenerateFunc } from "../builder/mixins/WithGenerate";
import { WithValidate, type WithValidateFunc } from "../builder/mixins/WithValidate";
import { WithAssociate, type WithAssociateFunc } from "../builder/mixins/WithAssociate";
import { WithCompute, type WithComputeFunc } from "../builder/mixins/WithCompute";

export interface ListFieldBuilder<T> extends FieldBuilder<T[]> {
  nullable: WithNullableProp<this>;
  readable: WithReadableFunc<this>;
  writable: WithWritableFunc<this>;
  default: WithDefaultFunc<this, T[]>;
  generate: WithGenerateFunc<this, T[]>;
  compute: WithComputeFunc<this>;
  validate: WithValidateFunc<this>;
  associate: WithAssociateFunc<T>;
}

const EnhancedBuilder = composeFieldBuilder(FieldBuilder<any[]>, [
  WithNullable,
  WithReadable,
  WithWritable,
  WithDefault,
  WithGenerate,
  WithCompute,
  WithValidate,
  WithAssociate,
]);

type ListBuilderWithoutAssoc<T> = Omit<ListFieldBuilder<T>, 'associate'>;
type ListBuilderWithAssoc<T> = ListFieldBuilder<T>;

export function list<T = any>(): ListBuilderWithoutAssoc<T>;
export function list<T = any>(targetType: string): ListBuilderWithAssoc<T>;
export function list<T = any>(targetType?: string): any {
  const builder = new EnhancedBuilder(ListField) as unknown as ListFieldBuilder<T>;
  if (targetType) {
    (builder as any)[BUILDER_TARGET_TYPE] = targetType;
    return builder as ListBuilderWithAssoc<T>;
  }
  return builder as ListBuilderWithoutAssoc<T>;
}