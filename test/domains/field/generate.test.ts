import { expect, describe, it } from "vitest";
import { Asset, nowDate } from "../../setup";

describe('Generate model methods', () => {
  describe('Asset', () => {
    describe('eager generate id', () => {
      it('generates an id right away for new model', () => {
        const asset = Asset.make({ name: 'someimage', type: 'image', size: 100, extension: 'jpg' });
        expect(asset.id).toBe(`asset-id-${nowDate.getTime()}`);
      });

      it('throws an error when trying to access non-initialized id for new model', () => {
        const asset = Asset.from({ name: 'Asset', type: 'image', size: 100, extension: 'png' });
        expect(() => asset.id).toThrow();
      });

      it('throws an error when trying to access non-initialized id for existing model', () => {
        const asset = Asset.from({ name: 'Asset', type: 'image', size: 100, extension: 'png' });
        expect(() => asset.id).toThrow();
      });

      it('throws an error when trying to generate an id for existing model', () => {
        const asset = Asset.from({ name: 'Asset', type: 'image', size: 100, extension: 'png' });
        expect(() => asset.generate('id')).toThrow();
      });
    });

    describe('lazy generate hash', () => {
      it('throws an error when trying to access non-initialized hash for new model', () => {
        const asset = Asset.make({ name: 'someimage', type: 'image', size: 100, extension: 'jpg' });
        expect(() => asset.hash).toThrow();
      });
      
      it('throws an error when trying to access non-initialized hash for existing model', () => {
        const asset = Asset.from({ name: 'Asset', type: 'image', size: 100, extension: 'png' });
        expect(() => asset.hash).toThrow();
      });

      it('generates a hash for new model', () => {
        const asset = Asset.make({ name: 'Asset', type: 'image', size: 100, extension: 'png' });
        asset.generate('hash');
        expect(asset.hash).toBeDefined();
      });

      it('generates a hash for existing model without providing the key', () => {
        const asset = Asset.make({ name: 'Asset', type: 'image', size: 100, extension: 'png' });
        asset.generate();
        expect(asset.hash).toBeDefined();
      });

      it('throws an error when trying to generate a hash for existing model', () => {
        const asset = Asset.from({ name: 'Asset', type: 'image', size: 100, extension: 'png' });
        expect(() => asset.generate('hash')).toThrow();
      });
    });
  });
});
