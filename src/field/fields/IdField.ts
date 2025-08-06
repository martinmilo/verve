import type { FieldGenerator } from "../core/types";
import { Field } from "../core/Field";

export class IdField extends Field<string> {
  static setGlobalGenerator(generator: FieldGenerator) {
    Field.globalGeneratorsMap.set(this, generator);
  }
}