import { expect, describe, it } from "vitest";
import { User, Post } from "../../setup";

describe('Model "only" method', () => {
  describe('User', () => {
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
});
