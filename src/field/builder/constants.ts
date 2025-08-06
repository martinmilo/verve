import type { FieldOptions } from "../core/types";

export const DEFAULT_FIELD_OPTIONS: FieldOptions = {
  nullable: false,
  readable: true,
  writable: true,
  default: undefined,
  generator: undefined,
  validators: [],
  associate: undefined,
} as const;