import { beforeAll, afterAll } from 'vitest';
import { Context } from '../../src/context';

beforeAll(() => {
  Context.useGlobalStorage();
});

afterAll(() => {
  Context.reset();
});
