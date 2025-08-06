import { describe, it, expect } from 'vitest';
import { Field } from '../core/Field';
import { FieldBuilder } from '../builder/FieldBuilder';
import { bool } from './bool.factory';

describe('bool.factory', () => {
  it('returns a field builder', () => {
    const builder = bool();
    expect(builder).toBeInstanceOf(FieldBuilder);
  });

  it('returns a field instance', () => {
    const builder = bool();
    expect(builder.toField()).toBeInstanceOf(Field);
  });

  it('returns correct options', () => {
    const builder = bool().nullable.readable(false).writable(false).default(true);
    expect(builder.toField().options).toEqual({
      ...FieldBuilder.defaultOptions,
      nullable: true,
      readable: false,
      writable: false,
      default: true,
    });
  });

  describe('validators', () => {
    const isNotAllowed = (_: boolean, model: any) => model.name === 'test';

    it('adds a validator to the field', () => {
      const builder = bool().validate([isNotAllowed]);

      expect(builder.toField().options).toEqual({
        ...FieldBuilder.defaultOptions,
        validators: expect.arrayContaining([expect.any(Function)])
      });
      expect(builder.toField().options.validators).toHaveLength(1);
    });
  });
});
