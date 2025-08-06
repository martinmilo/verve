import { composeFieldBuilder } from "../builder/compose";
import { FieldBuilder } from "../builder/FieldBuilder";
import { RecordField } from "../fields/RecordField";
import { BUILDER_TARGET_TYPE } from "../../constants";

import { WithNullable, type WithNullableProp } from "../builder/mixins/WithNullable";
import { WithReadable, type WithReadableFunc } from "../builder/mixins/WithReadable";
import { WithWritable, type WithWritableFunc } from "../builder/mixins/WithWritable";
import { WithDefault, type WithDefaultFunc } from "../builder/mixins/WithDefault";
import { WithGenerate, type WithGenerateFunc } from "../builder/mixins/WithGenerate";
import { WithValidate, type WithValidateFunc } from "../builder/mixins/WithValidate";
import { WithAssociate, type WithAssociateFunc } from "../builder/mixins/WithAssociate";
import { WithCompute, type WithComputeFunc } from "../builder/mixins/WithCompute";

export interface RecordFieldBuilder<T> extends FieldBuilder<T> {
  nullable: WithNullableProp<this>;
  readable: WithReadableFunc<this>;
  writable: WithWritableFunc<this>;
  default: WithDefaultFunc<this, T>;
  generate: WithGenerateFunc<this, T>;
  compute: WithComputeFunc<this>;
  validate: WithValidateFunc<this>;
  associate: WithAssociateFunc<T>;
}

const EnhancedBuilder = composeFieldBuilder(FieldBuilder<Record<string, any>>, [
  WithNullable,
  WithReadable,
  WithWritable,
  WithDefault,
  WithGenerate,
  WithCompute,
  WithValidate,
  WithAssociate,
]);

type RecordBuilderWithoutAssoc<T> = Omit<RecordFieldBuilder<T>, 'associate'>;
type RecordBuilderWithAssoc<T> = RecordFieldBuilder<T>;

export function record<T = any>(): RecordBuilderWithoutAssoc<T>;
export function record<T = any>(targetType: string): RecordBuilderWithAssoc<T>;
export function record<T = any>(targetType?: string): any {
  const builder = new EnhancedBuilder(RecordField) as unknown as RecordFieldBuilder<T>;
  if (targetType) {
    (builder as any)[BUILDER_TARGET_TYPE] = targetType;
    return builder as RecordBuilderWithAssoc<T>;
  }
  return builder as RecordBuilderWithoutAssoc<T>;
}