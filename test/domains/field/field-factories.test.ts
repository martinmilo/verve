
import { describe, it, expect, beforeEach } from 'vitest';
import { FieldBuilder, id, Field, bool, text } from '../../../src';
import { IdField } from '../../../src/field/fields/IdField';
import { isIdWritable } from '../../../src/field/factories/id.factory';
import { TextField } from '../../../src/field/fields/TextField';

describe('Field factories', () => {
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
});