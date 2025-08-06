import type { FieldValidator } from "../../core/types";
import type { WithFieldBuilder } from "../types";

import { mergeFieldValidators, toLazyFieldValidator } from "../../utils/validator";

type ChainedValidateFunc<T> = {
  (validators: FieldValidator | FieldValidator[]): T;
  add(validators: FieldValidator | FieldValidator[]): T;
  only(validators: FieldValidator | FieldValidator[]): T;
};

export type WithValidateFunc<T> = {
  (validators: FieldValidator | FieldValidator[]): T;
  add(validators: FieldValidator | FieldValidator[]): T;
  only(validators: FieldValidator | FieldValidator[]): T;
  none(): T;
  lazy: ChainedValidateFunc<T>;
};

export function WithValidate<TBase extends WithFieldBuilder>(Base: TBase) {
  return class WithValidate extends Base {
    get validate(): WithValidateFunc<this> {
      const self = this;

      const normalize = (validators: FieldValidator | FieldValidator[]) =>
        Array.isArray(validators) ? validators : [validators];
  
      const validateFunc: WithValidateFunc<this> = function (validators: FieldValidator | FieldValidator[]) {
        self.setOption('validators', mergeFieldValidators(self.Field, normalize(validators)));
        return self;
      };
  
      validateFunc.add = function (validators: FieldValidator | FieldValidator[]) {
        self.setOption('validators', mergeFieldValidators(self.Field, normalize(validators)));
        return self;
      };
    
      validateFunc.only = function (validators: FieldValidator | FieldValidator[]) {
        self.setOption('validators', normalize(validators));
        return self;
      };
  
      validateFunc.none = function () {
        self.setOption('validators', []);
        return self;
      };

      validateFunc.lazy = (function (validators: FieldValidator | FieldValidator[]) {
        self.setOption('validators', mergeFieldValidators(self.Field, normalize(validators).map(toLazyFieldValidator)));
        return self;
      }) as ChainedValidateFunc<this>;

      validateFunc.lazy.add = function (validators: FieldValidator | FieldValidator[]) {
        self.setOption('validators', mergeFieldValidators(self.Field, normalize(validators).map(toLazyFieldValidator)));
        return self;
      };

      validateFunc.lazy.only = function (validators: FieldValidator | FieldValidator[]) {
        self.setOption('validators', normalize(validators).map(toLazyFieldValidator));
        return self;
      };
  
      return validateFunc;
    }
  }
}
