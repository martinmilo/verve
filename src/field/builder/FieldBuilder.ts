import type { FieldOptions, FieldClass, FieldValidator, LazyFieldValidator, FieldCompute, LazyFieldCompute } from "../core/types";

import { FIELD_MODEL, FIELD_NAME } from "../../constants";
import { DEFAULT_FIELD_OPTIONS } from "../core/options";
import { Model } from "../../model";

export class FieldBuilder<T, Options extends FieldOptions = FieldOptions> {
  static defaultOptions = DEFAULT_FIELD_OPTIONS;

  constructor(
    public Field: FieldClass<T>,
    public options: Options = {} as Options
  ) {}

  public getOption<K extends keyof Options>(option: K): Options[K] {
    return this.options[option];
  }

  public setOption<K extends keyof Options>(option: K, value: Options[K]): void {
    this.options[option] = value;
  }

  public toField(model?: Model): InstanceType<typeof this.Field> {
    const modelName = (this as any)[FIELD_MODEL] as string;
    const fieldName = (this as any)[FIELD_NAME] as string;

    return new this.Field({ name: fieldName, model: modelName }, {
      ...this.options,
      nullable: this.options.nullable ?? FieldBuilder.defaultOptions.nullable,
      readable: this.options.readable ?? FieldBuilder.defaultOptions.readable,
      writable: this.options.writable ?? FieldBuilder.defaultOptions.writable,
      default: this.options.default ?? FieldBuilder.defaultOptions.default,
      compute: bindCompute(this.options.compute, model),
      generator: this.options.generator ?? this.Field.getGlobalGenerator?.() ?? FieldBuilder.defaultOptions.generator,
      validators: bindValidators(this.options.validators, model),
    });
  }
}

function bindValidators(providedValidators: (FieldValidator | LazyFieldValidator)[] = [], model?: Model) {
  const validators = providedValidators ?? FieldBuilder.defaultOptions.validators;

  if (!validators) {
    return [];
  }

  // Bind the model to the validator and preserve the original function properties (i.e. __isLazy identifier)
  return validators.map(validator => {
    if (typeof validator === 'function') {
      const boundValidator = (value: any) => validator(value, model);
      Object.assign(boundValidator, validator);
      Object.defineProperty(boundValidator, 'name', {
        value: validator.name,
        configurable: true
      });
      return boundValidator;
    }
    return validator;
  });
}

function bindCompute(providedCompute: FieldCompute | LazyFieldCompute | undefined, model?: Model) {
  const compute = providedCompute ?? FieldBuilder.defaultOptions.compute;

  if (!model) {
    return compute;
  }
  if (typeof compute === 'function') {
    const boundCompute = () => compute(model);
    Object.assign(boundCompute, compute);
    Object.defineProperty(boundCompute, 'name', {
      value: compute.name,
      configurable: true
    });
    return boundCompute;
  }
  return compute;
}