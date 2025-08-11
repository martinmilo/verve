import { expect, describe, it } from "vitest";
import { User, nowDate } from "../../setup";

describe('Model serialization', () => {
  describe('User', () => {
    it('serializes a model instance and skips hidden fields', () => {
      const user = User.make({ name: 'Martin', password: '123' });

      expect(JSON.stringify(user)).toEqual(
        JSON.stringify({
          id: 'some-id',
          name: 'Martin',
          role: 'user',
          groups: ['group-1', 'group-2'],
          settings: { theme: 'light', notifications: true },
          isActive: true,
          createdAt: nowDate.toISOString(),
        })
      );
    });
  });
});
