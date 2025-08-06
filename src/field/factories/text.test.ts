import { describe, it, expect, beforeEach } from 'vitest';
import { text } from './text.factory';
import { Field } from '../core/Field';
import { TextField } from '../fields/TextField';
import { FieldBuilder } from '../builder/FieldBuilder';

describe('text.factory', () => {
  it('returns a field builder', () => {
    const builder = text();
    expect(builder).toBeInstanceOf(FieldBuilder);
  });

  it('returns a field instance', () => {
    const builder = text();
    expect(builder.toField()).toBeInstanceOf(Field);
  });

  it('returns correct options', () => {
    const builder = text().nullable.readable(false).writable(false);
    expect(builder.toField().options).toEqual({
      ...FieldBuilder.defaultOptions,
      nullable: true,
      readable: false,
      writable: false,
    });
  });

  describe('validators', () => {
    // Global validator
    function isEmail(value: string) {
        return value.includes('@');
    }
    // Local validator
    const isTest = (value: string) => value === 'test';

    beforeEach(() => {
      TextField.setGlobalValidators([isEmail]);
    });

    it('adds another validator to global validators', () => {
      const builder = text().validate([isTest]);
      expect(builder.toField().options).toEqual({
        ...FieldBuilder.defaultOptions,
        validators: expect.arrayContaining([expect.any(Function), expect.any(Function)]),
      });
      expect(builder.toField().options.validators).toHaveLength(2);
    });

    it('overrides global validators and keeps only the provided validators', () => {
      const builder = text().readable(false).writable(false).validate.only([isTest]);
      expect(builder.toField().options).toEqual({
        ...FieldBuilder.defaultOptions,
        readable: false,
        writable: false,
        validators: expect.arrayContaining([expect.any(Function)]),
      });
      expect(builder.toField().options.validators).toHaveLength(1);
    });

    it('overrides global validators and removes all validators', () => {
      const builder = text().readable(false).writable(false).validate.none();
      expect(builder.toField().options).toEqual({
        ...FieldBuilder.defaultOptions,
        readable: false,
        writable: false,
        validators: [],
      });
    });
  });
});
