import { expect, describe, it, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { Context } from "../../../context";
import { User, Role, nowDate } from "./User";
import { Post } from "./Post";
import { ErrorCode, ErrorRegistry, VerveError, VerveErrorList } from "../../../errors";

describe('User', () => {
  beforeAll(() => {
    Context.useGlobalStorage();
  });

  afterAll(() => {
    Context.reset();
  });

  describe('instantiation', () => {
    it('creates a model instance with default/generated fields when using "make"', () => {
      const user = User.make({ password: '123', role: Role.MANAGER, email: 'invalidmail' });

      expect(user.id).toBe('some-id');
      expect(user.name).toBe(undefined);
      expect(user.email).toBe('invalidmail');
      expect(user.isActive).toBe(true);
      expect(user.createdAt).toBe(nowDate);
      expect(user.role).toEqual(Role.MANAGER);
      expect(user.groups).toEqual(['group-1', 'group-2']);
      expect(user.settings).toEqual({ theme: 'light', notifications: true });
    });

    it('creates a model instance without default/generated fields when using "from"', () => {
      const user = User.from({ password: '123', email: 'invalidmail' });

      expect(user.id).toBe(undefined);
      expect(user.name).toBe(undefined);
      expect(user.email).toBe('invalidmail');
      expect(user.isActive).toBe(undefined);
      expect(user.createdAt).toBe(undefined);
      expect(user.role).toEqual(undefined);
      expect(user.groups).toEqual(undefined);
      expect(user.settings).toEqual(undefined);
    });
  });

  describe('only', () => {
    it('returns a new model instance with only the specified fields (unsets all other fields)', () => {
      const user = User.make({ name: 'Martin', lastName: 'McDonald', password: '123', email: 'invalidmail' });
      expect(user.only(['name'])).toEqual({ id: 'some-id', name: 'Martin' });
    });

    it('works with associations and complex fields', () => {
      const post = Post.make({ id: 'post-id-1', title: 'Post 1', content: 'Content 1', author: { id: 'user-id' } });
      const user = User.make({
        id: 'user-id',
        name: 'Martin',
        lastName: 'McDonald',
        password: '123',
        email: 'invalidmail',
        groups: ['group-1', 'group-2'],
        settings: { theme: 'light', notifications: true },
        posts: [post],
      });
      
      expect(user.only(['groups', 'posts'])).toEqual({
        id: 'user-id',
        groups: ['group-1', 'group-2'],
        posts: [post],
      });
    });

    it('returns only ID field when no other fields are initialized', () => {
      const user = User.make({ password: '123', email: 'invalidmail' });
      expect(user.only(['lastName'])).toEqual({ id: 'some-id' });
    });
  });

  describe('except', () => {
    const defaultValues = {
      id: 'some-id',
      role: Role.USER,
      groups: ['group-1', 'group-2'],
      settings: { theme: 'light', notifications: true },
      isActive: true,
      createdAt: nowDate,
    }

    it('returns a new model instance with all fields except the specified ones', () => {
      const user = User.make({ name: 'Martin', lastName: 'McDonald', email: 'invalidmail' });
      expect(user.except(['lastName', 'email'])).toEqual({ ...defaultValues, name: 'Martin' });
    });

    it('throws an error when trying to exclude ID field', () => {
      const user = User.make({ name: 'Martin', lastName: 'McDonald', password: '123', email: 'invalidmail' });
      expect(() => user.except(['id'])).toThrow();
    });
  });

  describe('changes', () => {
    it('returns all input values (also default & generated) as changes for new model instance that was created with "make"', () => {
      const user = User.make({ password: '123', email: 'invalidmail' });
      user.name = 'Martin';

      expect(user.getChanges()).toEqual({
        id: 'some-id',
        name: 'Martin',
        password: '123',
        email: 'invalidmail',
        isActive: true,
        createdAt: nowDate,
        role: Role.USER,
        groups: ['group-1', 'group-2'],
        settings: { theme: 'light', notifications: true },
      });
    });

    it('returns only the final changes, excluding field that did not change', () => {
      const user = User.from({ password: '123', email: 'invalidmail' });
      user.name = 'Martin';
      user.email = 'invalidmail';
      user.password = '1234';
      user.password = '12345';

      expect(user.getChanges()).toEqual({
        name: 'Martin',
        password: '12345',
      });
    });

    it('returns changes when setting a field to null', () => {
      const user = User.from({ lastName: 'McDonald', password: '123', email: 'invalidmail' });
      user.name = 'Martin';
      user.lastName = null;

      expect(user.getChanges()).toEqual({
        name: 'Martin',
        lastName: null,
      });
    });

    it('returns changes when setting a field with different methods', () => {
      const user = User.from({ password: '123', email: 'invalidmail' });
      user.name = 'Martin';
      user.lastName = 'McDonald';
      user.$lastName.set('Random');

      expect(user.getChanges()).toEqual({
        name: 'Martin',
        lastName: 'Random',
      });
    });

    it('erases field from changelog when unsetting a value on it', () => {
      const user = User.from({ password: '123', email: 'invalidmail' });
      user.name = 'Martin';
      user.lastName = 'McDonald';
      user.$lastName.unset();

      const changes = user.getChanges();
      expect(changes).not.toHaveProperty('lastName');
      expect(changes).toEqual({ name: 'Martin' });
    });

    it('returns complex field changes (array, object, etc.)', () => {
      const user = User.from({ password: '123', email: 'invalidmail' });
      
      user.settings = { theme: 'dark', notifications: false };
      user.groups = ['group-1', 'group-2', 'group-3'];

      expect(user.getChanges()).toEqual({
        settings: { theme: 'dark', notifications: false },
        groups: ['group-1', 'group-2', 'group-3'],
      });
    });

    it('returns associations changes', () => {
      const post = Post.from({ id: 'post-id-1', title: 'Post 1', content: 'Content 1', author: { id: 'user-id' } });
      const user = User.from({ id: 'user-id', password: '123', email: 'invalidmail', posts: [post] });
      
      const otherPost = Post.from({ id: 'post-id-2', title: 'Post 2', content: 'Content 2', author: { id: 'user-id' } });
      user.posts.push(otherPost);

      expect(user.getChanges()).toEqual({
        posts: [post, otherPost],
      });
    });

    it('returns associations changes when changing one field on given association', () => {
      const post = Post.from({ id: 'post-id-1', title: 'Post 1', content: 'Content 1', author: { id: 'user-id' } });
      const user = User.from({ id: 'user-id', password: '123', email: 'invalidmail', posts: [post] });

      user.$posts.set([{ ...post, title: 'Post 1 updated' }]);

      expect(user.getChanges()).toEqual({
        posts: [{ ...post, title: 'Post 1 updated' }],
      });
    });

    it('returns changes made by concatenating arrays on groups', () => {
      const user = User.from({ password: '123', email: 'invalidmail', groups: ['group-1', 'group-2'] });
      const newGroups = ['group-3', 'group-4'];
      user.groups = [...user.groups, ...newGroups];
    });

    it('returns changes made by pushing to arrays on groups', () => {
      const user = User.from({ password: '123', email: 'invalidmail', groups: ['group-1', 'group-2'] });
      user.groups.push('group-3');

      expect(user.getChanges()).toEqual({
        groups: ['group-1', 'group-2', 'group-3'],
      });
    });

    it('returns changes made by unshifting to arrays on groups', () => {
      const user = User.from({ password: '123', email: 'invalidmail', groups: ['group-1', 'group-2'] });
      user.groups.unshift('group-0');

      expect(user.getChanges()).toEqual({
        groups: ['group-0', 'group-1', 'group-2'],
      });
    });

    it('returns changes made by unsetting array and object fields', () => {
      const user = User.from({
        password: '123', email: 'invalidmail',
        groups: ['group-1', 'group-2'],
        settings: { theme: 'light', notifications: true }
      });
      user.$groups.unset();
      user.$settings.unset();

      expect(user.getChanges()).toEqual({
        groups: undefined,
        settings: undefined,
      });
    });

    it('returns changes made by Object.assign on settings', () => {
      const user = User.from({ password: '123', email: 'invalidmail', settings: { theme: 'light', notifications: true } });
      Object.assign(user.settings, { notifications: false });

      expect(user.getChanges()).toEqual({
        settings: { theme: 'light', notifications: false },
      });
    });

    it('returns changes made by cloning and merging objects on settings', () => {
      const user = User.from({ password: '123', email: 'invalidmail', settings: { theme: 'light', notifications: true } });
      const newSettings = { theme: 'dark', notifications: false };
      user.settings = { ...user.settings, ...newSettings };

      expect(user.getChanges()).toEqual({
        settings: newSettings,
      });
    });
  });

  describe('validation', () => {
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
      const errors = user.$email.validate();
      expect(errors.count()).toBe(1);
    });

    it('returns an empty array when email is valid (lazy validation)', () => {
      const user = User.make({ password: '123', email: 'valid@mail.com' });
      const errors = user.$email.validate();
      expect(errors.count()).toBe(0);
    });

    it('returns false when email is invalid (lazy validation)', () => {
      const user = User.make({ password: '123', email: 'invalidmail.com' });
      expect(user.$email.isValid()).toBe(false);
    });

    it('returns true when email is valid (lazy validation)', () => {
      const user = User.make({ password: '123', email: 'invalidmail.com' });
      expect(user.$email.isValid()).toBe(false);
    });
  });

  describe('serialization', () => {
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

  describe('context', () => {
    describe('when global context is set', () => {
      const globalContext = {
        auth: { user: { id: '1', name: 'Admin' } }
      };

      beforeEach(() => {
        Context.set(globalContext);
      });

      afterEach(() => {
        Context.reset();
      });

      it('retrieves correct global context', () => {
        const user = User.make({ name: 'Martin', password: '123' });
        expect(user.getContext()).toEqual(globalContext);
      });

      it('retrieves instance context when using "withContext" on User model', () => {
        const instanceContext = { auth: { id: '3', name: 'User' } };
        const user = User.make({ name: 'Martin', password: '123' }).withContext(instanceContext);
        expect(user.getContext()).toEqual(instanceContext);
      });
    });

    describe('when global context is not set', () => {
      it('retrieves undefined for global context', () => {
        const user = User.make({ name: 'Martin', password: '123' });
        expect(user.getContext()).toEqual(undefined);
      });

      it('retrieves instance context when using "withContext" on User model', () => {
        const instanceContext = { auth: { id: '1', name: 'Admin' } };
        const user = User.make({ name: 'Martin', password: '123' }).withContext(instanceContext);
        expect(user.getContext()).toEqual(instanceContext);
      });
    });
  });

  describe('errors', () => {
    it('throws an error when trying to access a field that is not initialized', () => {
      const user = User.make({ password: '123', email: 'invalidmail' });

      expect(() => user.$name.get()).toThrowError(new VerveError(ErrorCode.FIELD_NOT_INITIALIZED, {
        field: 'name',
        model: 'User',
      }));
    });

    it('throws default error message', () => {
      const user = User.make({ password: '123', email: 'invalidmail' });

      expect(() => user.$name.get()).toThrowErrorMatchingInlineSnapshot(`[Error: ${ErrorCode.FIELD_NOT_INITIALIZED}: Field 'name' is not initialized on model 'User']`);
    });

    it('throws custom error message when registered', () => {
      ErrorRegistry.register({
        [ErrorCode.FIELD_NOT_INITIALIZED]: 'My custom error message!',
      });

      const user = User.make({ password: '123', email: 'invalidmail' });

      expect(() => user.$name.get()).toThrowErrorMatchingInlineSnapshot(`[Error: ${ErrorCode.FIELD_NOT_INITIALIZED}: My custom error message!]`);
    });

    it('throws custom error message without code when registered', () => {
      ErrorRegistry.hideCodes();
      ErrorRegistry.register({
        [ErrorCode.FIELD_NOT_INITIALIZED]: 'My custom error message!',
      });

      const user = User.make({ password: '123', email: 'invalidmail' });

      expect(() => user.$name.get()).toThrowErrorMatchingInlineSnapshot(`[Error: My custom error message!]`);
    });

    it('returns all field errors when model is not valid', () => {
      const user = User.make({ password: '123', email: 'invalidmail' });
      user.$name.set('Martin');
      user.$age.set(10);
      user.$password.set('1');

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

  describe('access rules', () => {
    describe('when context is not set (no auth context)', () => {
      it('throws when trying to read a "age" field which is restricted to admin', () => {
        const user = User.make({ name: 'Martin', password: '123', age: 21 });

        expect(() => user.age).toThrowError(new VerveError(ErrorCode.FIELD_NOT_READABLE, {
          field: 'age',
          model: 'User',
        }));
        expect(() => user.$age.get()).toThrowError(new VerveError(ErrorCode.FIELD_NOT_READABLE, {
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
        expect(() => { user.$role.set(Role.ADMIN) }).toThrowError(new VerveError(ErrorCode.FIELD_NOT_WRITABLE, {
          field: 'role',
          model: 'User',
        }));
      });
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
        expect(() => user.$age.get()).toThrow();
      });

      it('throws when trying to set a "role" field', () => {
        const user = User.make({ name: 'Martin', password: '123', age: 21 });

        expect(() => { user.role = Role.ADMIN }).toThrow();
        expect(() => { user.$role.set(Role.ADMIN) }).toThrow();
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

      it('sets the "role" field on the user with field instance', () => {
        const user = User.make({ name: 'Martin', password: '123', age: 21 });
        user.$role.set(Role.MANAGER);
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

  describe('authorization', () => {
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

  describe('associations', () => {
    describe('when user has two posts belonging to him', () => {
      const post1 = Post.make({ id: '1', title: 'Post 1', content: 'Content 1', author: { id: '1' } });
      const post2 = Post.make({ id: '2', title: 'Post 2', content: 'Content 2', author: { id: '1' } });

      const user = User.make({ id: '1', name: 'Martin', lastName: 'McDonald', password: '123', posts: [post1, post2] });

      it('associates posts to a user', () => {
        expect(user.posts).toEqual([post1, post2]);
      });
    });

    describe('when user receives a post that does not belong to him', () => {
      const post = Post.make({ id: '1', title: 'Post 1', content: 'Content 1', author: { id: '2' } });

      it('throws an error', () => {
        expect(() => {
          User.make({ id: '1', name: 'Martin', lastName: 'McDonald', password: '123', posts: [post] });
        }).toThrow();
      });
    });
  });
});
