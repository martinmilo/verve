import { FieldOptions } from "./types";

export const DEFAULT_FIELD_OPTIONS: FieldOptions = {
  nullable: false,
  readable: true,
  writable: true,
  default: undefined,
  compute: undefined,
  generator: undefined,
  validators: [],
  associate: undefined,
} as const;