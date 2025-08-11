import { expect, describe, it, beforeAll, afterAll } from "vitest";
import { User, Role } from "../../setup";
import { Context } from "../../../src";

Context.useGlobalStorage();

describe('Authorization', () => {
  describe('when context is not set (no auth context)', () => {
    const user = User.make({ name: 'Martin', lastName: 'McDonald', password: '123' });

    it('returns the full name since method is not protected', () => {
      expect(user.getFullName()).toBe('Martin McDonald');
    });

    it('throws an error when user is not authorized to call a method', () => {
      expect(() => user.adjustRole()).toThrow();
    });

    it('throws an error when user is not authorized to call a method', () => {
      expect(() => user.adjustSettings()).toThrow();
    });
  });

  describe('when context is set with admin user that is an owner of the model', () => {
    const user = User.from({ name: 'Martin', lastName: 'McDonald', password: '123' });
    const context = { auth: { id: '1', name: 'Admin', role: Role.ADMIN } };

    beforeAll(() => {
      Context.set(context);
    });

    afterAll(() => {
      Context.reset();
    });

    it('returns the full name since method is not protected', () => {
      expect(user.getFullName()).toBe('Martin McDonald');
    });

    it('returns adjusted role since auth user is admin', () => {
      expect(user.adjustRole()).toBe('adjusted role');
    });

    it('throws an error when user is not owner of the model', () => {
      expect(() => user.adjustSettings()).toThrow();
    });
  });

  describe('when context is set with regular user that is actual owner of the model', () => {
    const user = User.from({ id: '1', name: 'Martin', lastName: 'McDonald', password: '123', role: Role.USER });
    const context = { auth: user };

    beforeAll(() => {
      Context.set(context);
    });

    afterAll(() => {
      Context.reset();
    });

    it('returns the full name since method is not protected', () => {
      expect(user.getFullName()).toBe('Martin McDonald');
    });

    it('throws an error because user is not admin', () => {
      expect(() => user.adjustRole()).toThrow();
    });

    it('returns adjusted settings since user is owner of the model', () => {
      expect(user.adjustSettings()).toBe('adjusted settings');
    });
  });
});
