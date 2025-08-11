import { expect, describe, it } from "vitest";
import { Post } from "../../setup";

describe('Presence', () => {
  describe('isEmpty', () => {
    it('returns true when the model is completely empty', () => {
      const post = Post.make({ id: '', assets: [] });
      expect(post.isEmpty()).toBe(true);
    });

    it('returns false when the model has at least one value', () => {
      const post = Post.make({ id: '', content: 'Content 1', assets: [] });
      expect(post.isEmpty()).toBe(false);
    });
  });

  describe('hasEmpty', () => {
    it('returns true when the value is empty string', () => {
      const post = Post.make({ id: '1', title: '', content: 'Content 1', assets: [] });
      expect(post.hasEmpty(['title'])).toBe(true);
    });

    it('returns true when the value is just whitespace string', () => {
      const post = Post.make({ id: '1', title: '', content: 'Content 1', assets: [] });
      expect(post.hasEmpty(['title'])).toBe(true);
    });

    it('returns false when the value is a string with characters', () => {
      const post = Post.make({ id: '1', title: 'Post 1', content: 'Content 1', assets: [] });
      expect(post.hasEmpty(['title'])).toBe(false);
    });

    it('returns true when the value is an empty array', () => {
      const post = Post.make({ id: '1', content: 'Content 1', assets: [] });
      expect(post.hasEmpty(['assets'])).toBe(true);
    });
  });
});
