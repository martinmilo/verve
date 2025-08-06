import { ErrorCode, VerveError } from "../../errors";
import { ContextAdapter } from "../types";

let adapter: ContextAdapter | null = null;
let hasExplicitlySetAdapter = false;

export namespace Context {
  export function setAdapter(customAdapter: ContextAdapter) {
    adapter = customAdapter;
    hasExplicitlySetAdapter = true;
  }

  export function useAsyncLocalStorage() {
    // More robust Node.js detection
    const hasNodejsAsyncHooks = (() => {
      try {
        // Check if we can access async_hooks without actually requiring it yet
        return typeof require !== 'undefined' && 
               typeof process !== 'undefined' && 
               process.versions && 
               process.versions.node &&
               typeof require.resolve === 'function';
      } catch {
        return false;
      }
    })();

    if (!hasNodejsAsyncHooks) {
      throw new VerveError(ErrorCode.ASYNC_LOCAL_STORAGE_REQUIRES_NODEJS);
    }
    
    try {
      const { AsyncLocalStorage } = require('async_hooks');
      const asyncLocalStorage = new AsyncLocalStorage();
      
      setAdapter({
        get: () => asyncLocalStorage.getStore(),
        set: () => {
          throw new VerveError(ErrorCode.CONTEXT_USE_RUN_METHOD);
        },
        reset: () => {
          throw new VerveError(ErrorCode.CONTEXT_AUTO_RESET);
        },
        run: (context, fn) => asyncLocalStorage.run(context, fn)
      });
    } catch (error) {
      throw new VerveError(ErrorCode.ASYNC_LOCAL_STORAGE_SETUP_FAILED, error instanceof Error ? error.message : String(error));
    }
  }

  export function useGlobalStorage() {
    setAdapter(createGlobalContextAdapter());
  }

  function ensureAdapter() {
    if (!adapter) {
      // More robust Node.js detection for the error check
      const looksLikeNodeJS = typeof process !== 'undefined' && 
                              process.versions && 
                              process.versions.node &&
                              typeof require !== 'undefined';
                              
      if (looksLikeNodeJS && !hasExplicitlySetAdapter) {
        throw new VerveError(ErrorCode.CONTEXT_ADAPTER_REQUIRED);
      }
      // Fallback to global adapter for browser environments
      adapter = createGlobalContextAdapter();
    }
    return adapter;
  }

  export function set(context: any) {
    ensureAdapter().set(context);
  }

  export function get(): any {
    return ensureAdapter().get();
  }

  export function reset() {
    ensureAdapter().reset();
  }

  export function run<T>(context: any, fn: () => T): T {
    return ensureAdapter().run(context, fn);
  }
}

function createGlobalContextAdapter(): ContextAdapter {
  let globalContext: any;
  return {
    get: () => globalContext,
    set: (context) => { globalContext = context; },
    reset: () => { globalContext = undefined; },
    run: (context, fn) => {
      globalContext = context;
      try { return fn(); } finally { globalContext = undefined; }
    },
  };
}