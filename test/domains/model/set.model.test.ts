import { expect, describe, it } from "vitest";
import { DEFAULT_USER_ID, User } from "../../setup";

describe('Field set', () => {
  describe('User', () => {
    it('overrides an id for new model', () => {
      const user = User.make({ name: 'Martin', lastName: 'McDonald', password: '123', email: 'invalidmail' });
      expect(user.id).toBe(DEFAULT_USER_ID);
      user.set({ id: 'other-id'});
      expect(user.id).toBe('other-id');
    });

    it('throws an error when trying to set id on existing model', () => {
      const user = User.from({ name: 'Martin', lastName: 'McDonald', password: '123', email: 'invalidmail' });
      expect(() => user.set({ id: 'other-id' })).toThrow();
    });

    it('throws an error when trying to set number on text field', () => {
      const user = User.from({ name: 'Martin', lastName: 'McDonald', password: '123', email: 'invalidmail' });
      expect(() => user.set({ lastName: 123 })).toThrow();
    });

    it('throws an error when trying to set array on object field', () => {
      const user = User.from({ name: 'Martin', lastName: 'McDonald', password: '123', email: 'invalidmail' });
      expect(() => user.set({ settings: [{ theme: 'dark', notifications: true }] })).toThrow();
    });

    it('throws an error when trying to set object on array field', () => {
      const user = User.from({ name: 'Martin', lastName: 'McDonald', password: '123', email: 'invalidmail' });
      expect(() => user.set({ groups: { theme: 'dark', notifications: true } })).toThrow();
    });
  });
});
