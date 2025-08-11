import { expect, describe, it, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { Context } from "../../../src/context";
import { User } from "../../setup";

describe('Context', () => {
  beforeAll(() => {
    Context.useGlobalStorage();
  });

  afterAll(() => {
    Context.reset();
  });
  
  describe('User', () => {
    describe('when global context is set', () => {
      const globalContext = {
        auth: { user: { id: '1', name: 'Admin' } }
      };

      beforeEach(() => {
        Context.set(globalContext);
      });

      afterEach(() => {
        Context.reset();
      });

      it('retrieves correct global context', () => {
        const user = User.make({ name: 'Martin', password: '123' });
        expect(user.getContext()).toEqual(globalContext);
      });

      it('retrieves instance context when using "withContext" on User model', () => {
        const instanceContext = { auth: { id: '3', name: 'User' } };
        const user = User.make({ name: 'Martin', password: '123' }).withContext(instanceContext);
        expect(user.getContext()).toEqual(instanceContext);
      });
    });

    describe('when global context is not set', () => {
      it('retrieves undefined for global context', () => {
        const user = User.make({ name: 'Martin', password: '123' });
        expect(user.getContext()).toEqual(undefined);
      });

      it('retrieves instance context when using "withContext" on User model', () => {
        const instanceContext = { auth: { id: '1', name: 'Admin' } };
        const user = User.make({ name: 'Martin', password: '123' }).withContext(instanceContext);
        expect(user.getContext()).toEqual(instanceContext);
      });
    });
  });
});
