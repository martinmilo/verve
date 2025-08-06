import { expect, describe, it } from "vitest";
import { Post } from "./Post";
import { Asset, dateNow } from "./Asset";

describe('Asset', () => {
  describe('instantiation', () => {
    it('throws an error when extension is not valid', () => {
      expect(() => Asset.make({ id: '1', name: 'someimage', size: 100, type: 'image', extension: 'pdf' })).toThrow();
    });

    it('throws an error when type and extension is out of sync', () => {
      expect(() => Asset.make({ id: '1', name: 'someimage', size: 100, type: 'image', extension: 'mp4' })).toThrow();
    });
  });

  describe('compute', () => {
    describe('url', () => {
      it('returns a url computed from model properties when making new model', () => {
        const asset = Asset.make({ id: '1', name: 'new', type: 'image', size: 100, extension: 'jpg' });
        expect(asset.url).toBe(`https://some-storage-url/1/new.jpg`);
      });

      it('returns a url computed from model properties when hydrating existing model', () => {
        const asset = Asset.from({ id: '1', name: 'existing', type: 'image', size: 100, extension: 'jpg' });
        expect(asset.url).toBe(`https://some-storage-url/1/existing.jpg`);
      });
  
      it('throws an error when some of the fields (name) is undefined for computing url', () => {
        const asset = Asset.make({ id: '1', size: 100, type: 'image', extension: 'jpg' });
        expect(() => asset.url).toThrow(); // name is undefined
      });

      it('throws an error when some of the fields (name) is not valid for computing url', () => {
        const asset = Asset.make({ id: '1', name: 'someimage.jpg', size: 100, type: 'image', extension: 'jpg' });
        expect(() => asset.url).toThrow(); // extension is not valid (contains a dot)
      });
    });
  });

  describe('generate', () => {
    describe('eager generate id', () => {
      it('generates an id right away for new model', () => {
        const asset = Asset.make({ name: 'someimage', type: 'image', size: 100, extension: 'jpg' });
        expect(asset.id).toBe(`asset-id-${dateNow.getTime()}`);
      });

      it('returns undefined when trying to access non-initialized id for new model', () => {
        const asset = Asset.from({ name: 'Asset', type: 'image', size: 100, extension: 'png' });
        expect(asset.id).toBe(undefined);
      });

      it('throws an error when trying to access non-initialized id for existing model', () => {
        const asset = Asset.from({ name: 'Asset', type: 'image', size: 100, extension: 'png' });
        expect(() => asset.$id.get()).toThrow();
      });

      it('throws an error when trying to generate an id for existing model', () => {
        const asset = Asset.from({ name: 'Asset', type: 'image', size: 100, extension: 'png' });
        expect(() => asset.$id.generate()).toThrow();
      });
    });

    describe('lazy generate hash', () => {
      it('returns undefined when trying to access non-initialized hash for new model', () => {
        const asset = Asset.make({ name: 'someimage', type: 'image', size: 100, extension: 'jpg' });
        expect(asset.hash).toBe(undefined);
      });
      
      it('throws an error when trying to access non-initialized hash for existing model', () => {
        const asset = Asset.from({ name: 'Asset', type: 'image', size: 100, extension: 'png' });
        expect(() => asset.$hash.get()).toThrow();
      });

      it('generates a hash for new model', () => {
        const asset = Asset.from({ name: 'Asset', type: 'image', size: 100, extension: 'png' });
        expect(() => asset.$hash.generate()).toThrow();
      });

      it('throws an error when trying to generate a hash for existing model', () => {
        const asset = Asset.from({ name: 'Asset', type: 'image', size: 100, extension: 'png' });
        expect(() => asset.$hash.generate()).toThrow();
      });
    });
  });

  describe('custom methods', () => {
    describe('url', () => {
      it('returns a url computed from model properties', () => {
        const asset = Asset.make({ id: '1', name: 'someimage', type: 'image', size: 100, extension: 'jpg' });
        expect(asset.getURL()).toBe(`https://some-storage-url/1/someimage.jpg`);
      });
  
      it('throws an error when some of the fields (name) is undefined for computing url', () => {
        const asset = Asset.make({ id: '1', size: 100, type: 'image', extension: 'jpg' });
        expect(() => asset.getURL()).toThrow(); // name is undefined
      });

      it('throws an error when some of the fields (name) is not valid for computing url', () => {
        const asset = Asset.make({ id: '1', name: 'someimage.jpg', size: 100, type: 'image', extension: 'jpg' });
        expect(() => asset.getURL()).toThrow(); // extension is not valid (contains a dot)
      });
    });
  });

  describe('associations', () => {
    const post = Post.make({ id: '1', title: 'Post 1', content: 'Content 1', author: { id: '2' } });

    it('throws an error when asset references a post that does not belong to it', () => {
      expect(() => {
        Asset.make({ id: '1', name: 'Asset 1', type: 'image', size: 100, post });
      }).toThrow();
    });
  });
});
