import { expect, describe, it } from "vitest";
import { Asset, User, Role, nowDate } from "../../setup";

describe('Model make method', () => {
  describe('Asset', () => {
    it('throws an error when extension is not valid', () => {
      // Extension can only be jpg or png since it's defined in validation
      expect(() => Asset.make({ id: '1', name: 'someimage', size: 100, type: 'image', extension: 'pdf' })).toThrow();
    });

    it('throws an error when type and extension is mismatched', () => {
      // We expect type and extension to be matched
      // If the asset says it's an image, it should have a jpg or png extension
      // Thus in this case we expect an error to be thrown
      expect(() => Asset.make({ id: '1', name: 'someimage', size: 100, type: 'image', extension: 'mp4' })).toThrow();
    });
  });

  describe('User', () => {
    it('throws an error when trying to hydrate model with field that fails eager validator', () => {
      expect(() => User.make({ password: '1' })).toThrow();
    });

    it('throws an error when trying to access field that fails lazy validator', () => {
      const user = User.make({ email: 'invalidmail' });
      expect(() => user.email).toThrow();
    });

    it('creates a model instance with default/generated fields', () => {
      const user = User.make({ password: '123', role: Role.MANAGER, email: 'martin@example.com' });

      expect(user).toEqual({
        id: 'some-id',
        email: 'martin@example.com',
        isActive: true,
        createdAt: nowDate,
        role: Role.MANAGER,
        groups: ['group-1', 'group-2'],
        settings: { theme: 'light', notifications: true },
      });

      expect(user.id).toBe('some-id');
      expect(user.email).toBe('martin@example.com');
      expect(user.isActive).toBe(true);
      expect(user.createdAt).toBe(nowDate);
      expect(user.role).toEqual(Role.MANAGER);
      expect(user.groups).toEqual(['group-1', 'group-2']);
      expect(user.settings).toEqual({ theme: 'light', notifications: true });
    });
  });
});
