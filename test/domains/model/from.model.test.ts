import { expect, describe, it } from "vitest";
import { Asset, User } from "../../setup";

describe('Model from method', () => {
  describe('Asset', () => {
    it('throws an error when extension is not valid', () => {
      // Extension can only be jpg or png since it's defined in validation
      expect(() => Asset.from({ id: '1', name: 'someimage', size: 100, type: 'image', extension: 'pdf' })).toThrow();
    });

    it('throws an error when type and extension is mismatched', () => {
      // We expect type and extension to be matched
      // If the asset says it's an image, it should have a jpg or png extension
      // Thus in this case we expect an error to be thrown
      expect(() => Asset.from({ id: '1', name: 'someimage', size: 100, type: 'image', extension: 'mp4' })).toThrow();
    });
  });

  describe('User', () => {
    it('creates a model instance without default/generated fields', () => {
      const user = User.from({ password: '123', email: 'martin@example.com' });

      expect(user.email).toBe('martin@example.com');
      expect(user).toEqual({ email: 'martin@example.com' });
    });
  });
});
