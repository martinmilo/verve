import { expect, describe, it } from "vitest";
import { User } from "../../setup";
import { ErrorCode, ErrorRegistry, VerveError } from "../../../src/errors";

describe('Errors', () => {
  describe('User', () => {
    it('throws an error when trying to access a field that is not initialized', () => {
      const user = User.make({ password: '123', email: 'invalidmail' });

      expect(() => user.name).toThrowError(new VerveError(ErrorCode.FIELD_NOT_INITIALIZED, {
        field: 'name',
        model: 'User',
      }));
    });

    it('throws default error message', () => {
      const user = User.make({ password: '123', email: 'invalidmail' });
      expect(() => user.name).toThrowErrorMatchingInlineSnapshot(
        `[Error: ${ErrorCode.FIELD_NOT_INITIALIZED}: Field 'name' is not initialized on model 'User']`
      );
    });

    it('throws custom error message when registered', () => {
      ErrorRegistry.register({
        [ErrorCode.FIELD_NOT_INITIALIZED]: 'My custom error message!',
      });

      const user = User.make({ password: '123', email: 'invalidmail' });
      expect(() => user.name).toThrowErrorMatchingInlineSnapshot(
        `[Error: ${ErrorCode.FIELD_NOT_INITIALIZED}: My custom error message!]`
      );
    });

    it('throws custom error message without code when registered', () => {
      ErrorRegistry.hideCodes();
      ErrorRegistry.register({
        [ErrorCode.FIELD_NOT_INITIALIZED]: 'My custom error message!',
      });

      const user = User.make({ password: '123', email: 'invalidmail' });

      expect(() => user.name).toThrowErrorMatchingInlineSnapshot(`[Error: My custom error message!]`);
    });

    it('returns all field errors when model is not valid', () => {
      const user = User.make({ password: '123', email: 'invalidmail' });
      user.set({ name: 'Martin', age: 10, password: '1' });

      const errors = user.validate();

      expect(errors.count()).toBe(3);
      expect(errors.contains(ErrorCode.FIELD_VALIDATOR_FAILED)).toBe(true);
      expect(errors.toErrorMessagesWithCode().sort()).toEqual([
        `Field 'password' validator 'anonymous' failed on model 'User'`,
        `Field 'age' validator 'anonymous' failed on model 'User'`,
        `Field 'email' validator 'anonymous' failed on model 'User'`,
      ].sort());
    });
  });
});
