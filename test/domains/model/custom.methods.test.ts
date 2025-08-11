import { expect, describe, it } from "vitest";
import { Asset } from "../../setup";

describe('Custom model methods', () => {
  describe('Asset', () => {
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
