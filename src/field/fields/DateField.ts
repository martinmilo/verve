import type { FieldGenerator } from "../core/types";
import { Field } from "../core/Field";

export class DateField extends Field<Date> {
  static setGlobalGenerator(generator: FieldGenerator) {
    Field.globalGeneratorsMap.set(this, generator);
  }
}