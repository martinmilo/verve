import { expect, describe, it } from "vitest";
import { User } from "../../setup";
import { ErrorCode, VerveError, VerveErrorList } from "../../../src/errors";

describe('Model validation', () => {
  describe('User', () => {
    it('throws an error when one of the fields is not valid (eager validation)', () => {
      const errors = VerveErrorList.new();

      errors.add(ErrorCode.FIELD_VALIDATOR_FAILED, {
        field: 'age',
        validator: 'anonymous',
        model: 'User',
      });

      expect(errors.contains(ErrorCode.FIELD_VALIDATOR_FAILED)).toBe(true);
      expect(() => User.make({ password: '123', age: 10 })).toThrowError(new VerveError(ErrorCode.MODEL_FIELD_VALIDATION_FAILED, {
        model: 'User',
        errors: errors.toErrorMessagesWithCode().join('\n'),
      }));
    });

    it('returns an error when one of the fields is not valid (lazy validation)', () => {
      const user = User.make({ password: '123', email: 'invalidmail.com' });
      const errors = user.validate(['email']);
      expect(errors.count()).toBe(1);
    });

    it('returns an empty array when email is valid (lazy validation)', () => {
      const user = User.make({ password: '123', email: 'valid@mail.com' });
      const errors = user.validate(['email']);
      expect(errors.count()).toBe(0);
    });
  });
});
