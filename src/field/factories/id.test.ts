
import { describe, it, expect, beforeEach } from 'vitest';
import { FieldBuilder } from '../builder/FieldBuilder';
import { IdField } from '../fields/IdField';
import { Field } from '../core/Field';
import { id, isIdWritable } from './id.factory';

describe('id.factory', () => {
  const defaultIdFieldOptions = {
    ...FieldBuilder.defaultOptions,
    writable: isIdWritable,
  };

  it('returns a field builder', () => {
    const builder = id();
    expect(builder).toBeInstanceOf(FieldBuilder);
  });

  it('returns a field instance', () => {
    const builder = id().generate(() => '123').validate.lazy([() => true]);
    expect(builder.toField()).toBeInstanceOf(Field);
  });

  it('returns correct default options', () => {
    const builder = id();
    expect(builder.toField().options).toEqual(defaultIdFieldOptions);
  });

  describe('generators', () => {
    const generateId = () => 'random-id';
    const differentId = () => 'different-id';

    beforeEach(() => {
      IdField.setGlobalGenerator(generateId);
    });

    it('returns options with a global generator', () => {
      const builder = id();
      expect(builder.toField().options).toEqual({...defaultIdFieldOptions, generator: generateId});
    });

    it('overrides global generator and keeps only the provided lazy generator', () => {
      const builder = id().generate.lazy(differentId);
      expect(builder.toField().options).toEqual({...defaultIdFieldOptions, generator: differentId});
    });

    it('overrides global generator and keeps only the provided eager generator', () => {
      const builder = id().generate(differentId);
      expect(builder.toField().options).toEqual({...defaultIdFieldOptions, generator: differentId});
    });
  });
});
