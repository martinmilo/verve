import { expect, describe, it } from "vitest";
import { Post } from "./Post";
import { Asset } from "./Asset";

describe('Post', () => {
  describe('associations', () => {
    const asset = Asset.make({ id: '1' });

    it('throws an error when post references an asset that is not connected to any post', () => {
      expect(() => {
        Post.make({ id: '1', title: 'Post 1', content: 'Content 1', assets: [asset] });
      }).toThrow();
    });
  });

  describe('field methods', () => {
    describe('is', () => {
      it('returns true when the string value is the same', () => {
        const post = Post.make({ id: '1', title: 'Post 1', content: 'Content 1', assets: [] });
        expect(post.$title.is('Post 1')).toBe(true);
      });

      it('returns true when the array values are the same', () => {
        const asset = Asset.make({ id: '1', name: 'file1', post: { id: '1' } });
        const post = Post.make({ id: '1', title: 'Post 1', content: 'Content 1', assets: [asset] });
        expect(post.$assets.is([asset])).toBe(true);
      });

      it('returns true when the nested object values are the same', () => {
        const asset = Asset.make({ id: '1', name: 'file1', post: { id: '1', title: 'Post 1' } });
        const post = Post.make({ id: '1', title: 'Post 1', content: 'Content 1', assets: [asset] });
        expect(post.$assets.is([{ ...asset, post: { id: '1', title: 'Post 1' } }])).toBe(true);
      });

      it('returns false when the array values are not equal', () => {
        const asset = Asset.make({ id: '1', name: 'file1', post: { id: '1' } });
        const post = Post.make({ id: '1', title: 'Post 1', content: 'Content 1', assets: [asset] });
        expect(post.$assets.is([{ ...asset, name: 'file2' }])).toBe(false);
      });

      it('returns false when the nested object values are not equal', () => {
        const asset = Asset.make({ id: '1', name: 'file1', post: { id: '1', title: 'Post 1' } });
        const post = Post.make({ id: '1', title: 'Post 1', content: 'Content 1', assets: [asset] });
        expect(post.$assets.is([{ ...asset, post: { id: '1', title: 'Post 2' } }])).toBe(false);
      });
    });

    describe('isEmpty', () => {
      it('returns true when the value is undefined', () => {
        const post = Post.make({ id: '1', content: 'Content 1', assets: [] });
        expect(post.$title.isEmpty()).toBe(true);
      });

      it('returns true when the value is empty string', () => {
        const post = Post.make({ id: '1', title: '', content: 'Content 1', assets: [] });
        expect(post.$title.isEmpty()).toBe(true);
      });

      it('returns true when the value is just whitespace string', () => {
        const post = Post.make({ id: '1', title: '', content: 'Content 1', assets: [] });
        expect(post.$title.isEmpty()).toBe(true);
      });

      it('returns false when the value is a string with characters', () => {
        const post = Post.make({ id: '1', title: 'Post 1', content: 'Content 1', assets: [] });
        expect(post.$title.isEmpty()).toBe(false);
      });

      it('returns true when the value is an empty array', () => {
        const post = Post.make({ id: '1', content: 'Content 1', assets: [] });
        expect(post.$assets.isEmpty()).toBe(true);
      });
    });
  });
});
