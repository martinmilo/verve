import { expect, describe, it } from "vitest";
import { User, Role, nowDate, Post } from "../../setup";

describe('Model changes', () => {
  describe('User', () => {
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
      user.lastName = 'Random';

      expect(user.getChanges()).toEqual({
        name: 'Martin',
        lastName: 'Random',
      });
    });

    it('erases field from changelog when unsetting a value on it', () => {
      const user = User.from({ password: '123', email: 'invalidmail' });
      user.name = 'Martin';
      user.lastName = 'McDonald';
      user.unset(['lastName']);

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

      user.posts = [{ ...post, title: 'Post 1 updated' }];

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
      user.unset(['groups', 'settings']);

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
});
