import { expect, describe, it, beforeAll, afterAll } from "vitest";
import { Context, ErrorCode, VerveError } from "../../../src";
import { User, Role } from "../../setup";

describe('Model access', () => {
  describe('User', () => {
    describe('when context is not set (no auth context)', () => {
      it('throws when trying to read a "age" field which is restricted to admin', () => {
        const user = User.make({ name: 'Martin', password: '123', age: 21 });

        expect(() => user.age).toThrowError(new VerveError(ErrorCode.FIELD_NOT_READABLE, {
          field: 'age',
          model: 'User',
        }));
      });

      it('throws when trying to set a "role" field', () => {
        const user = User.make({ name: 'Martin', password: '123', age: 21 });

        expect(() => { user.role = Role.ADMIN }).toThrowError(new VerveError(ErrorCode.FIELD_NOT_WRITABLE, {
          field: 'role',
          model: 'User',
        }));
      });

      it('throws when setting a "role" field without existing hydrated id', () => {
        expect(() => User.from({ name: 'Martin', role: Role.MANAGER, password: '123', age: 21 })).toThrow(); // Throws since role access depends on user.id
      });

      it('sets age field even though it is only readable to admins', () => {
        const user = User.from({ name: 'Martin', password: '123', age: 21 });
        expect(user).toEqual({ name: 'Martin' });

        user.set({ age: 22 });
        expect(user).toEqual({ name: 'Martin' });
        
        const changes = user.getChanges();
        expect(changes).toEqual({ age: 22 });
      });

      it('filters out non readable fields when trying to read a "age" field which is restricted to admin', () => {
        const user = User.from({ name: 'Martin', password: '123', age: 21 });
        expect(user).toEqual({ name: 'Martin' });
      })
    });

    describe('when context is set with regular user which is not an owner of the model', () => {
      const context = { auth: { id: '1', name: 'User', role: Role.USER } };

      beforeAll(() => {
        Context.set(context);
      });

      afterAll(() => {
        Context.reset();
      });

      it('throws when trying to read a "age" field which is restricted to admin', () => {
        const user = User.make({ name: 'Martin', password: '123', age: 21 });
        expect(() => user.age).toThrow();
      });

      it('throws when trying to set a "role" field', () => {
        const user = User.make({ name: 'Martin', password: '123', age: 21 });
        expect(() => { user.role = Role.ADMIN }).toThrow();
      });
    });

    describe('when context is set with admin user', () => {
      const context = { auth: { id: '1', name: 'Admin', role: Role.ADMIN } };

      beforeAll(() => {
        Context.set(context);
      });

      afterAll(() => {
        Context.reset();
      });

      it('returns the age since the field is readable by admin', () => {
        const user = User.make({ name: 'Martin', password: '123', age: 21 });
        expect(user.age).toBe(21);
      });

      it('sets the "role" field on the user with default value assignment', () => {
        const user = User.make({ name: 'Martin', password: '123', age: 21 });
        user.role = Role.MANAGER;
        expect(user.role).toBe(Role.MANAGER);
        expect(JSON.stringify(user)).toContain('"role":"manager"');
      });

      it('sets the "role" field on the user with model setter method', () => {
        const user = User.make({ name: 'Martin', password: '123', age: 21 });
        user.set({ role: Role.MANAGER });
        expect(user.role).toBe(Role.MANAGER);
        expect(JSON.stringify(user)).toContain('"role":"manager"');
      });

      it('throws when global context is overriden for this instance by regular user', () => {
        const user1 = User.make({ name: 'Martin', password: '123', age: 21 }).withContext({ auth: { id: '2', name: 'User', role: Role.USER } });
        const user2 = User.make({ name: 'Martin', password: '123', age: 21 }).withContext({ auth: { id: '2', name: 'User', role: Role.ADMIN } });

        expect(() => user1.age).toThrow();
        expect(() => user2.age).not.toThrow();
      });
    });
  });
});
