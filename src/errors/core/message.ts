import { ErrorCode } from './codes';

export const errorMessages: Record<ErrorCode, string> = {
  // Authorization errors
  [ErrorCode.UNAUTHORIZED_METHOD_CALL]: 'Unauthorized to call method {{method}}',
  
  // Model instantiation errors
  [ErrorCode.DIRECT_INSTANTIATION_NOT_ALLOWED]: 'Direct instantiation not allowed. Use .make() or .from() instead.',
  
  // Field access errors
  [ErrorCode.FIELD_NOT_READABLE]: "Field '{{field}}' is not readable on model '{{model}}'",
  [ErrorCode.FIELD_NOT_INITIALIZED]: "Field '{{field}}' is not initialized on model '{{model}}'",
  [ErrorCode.FIELD_TYPE_MISMATCH]: "Field '{{field}}' type mismatch on model '{{model}}'",
  [ErrorCode.FIELD_NOT_WRITABLE]: "Field '{{field}}' is not writable on model '{{model}}'",
  [ErrorCode.FIELD_IS_COMPUTED]: "Field '{{field}}' is computed and cannot be overwritten on model '{{model}}'",
  [ErrorCode.FIELD_SET_ERROR]: "Error setting field '{{field}}' on model '{{model}}'",
  [ErrorCode.FIELD_UNSET_ERROR]: "Error unsetting field '{{field}}' on model '{{model}}'",
  [ErrorCode.FIELD_NO_GENERATOR]: "Field '{{field}}' has no generator on model '{{model}}'",
  [ErrorCode.FIELD_ALREADY_GENERATED]: "Field '{{field}}' has already been generated on model '{{model}}'",
  [ErrorCode.FIELD_CANNOT_GENERATE_EXISTING]: "Field '{{field}}' on existing model cannot be generated on model '{{model}}'",
  [ErrorCode.FIELD_NO_COMPUTE]: "Field '{{field}}' has no compute on model '{{model}}'",
  [ErrorCode.FIELD_COMPUTE_NOT_MUTABLE]: "Field '{{field}}' is computed and cannot be mutated on model '{{model}}'",
  
  // Field validator errors
  [ErrorCode.FIELD_NOT_NULLABLE]: "Field '{{field}}' is not nullable on model '{{model}}'",
  [ErrorCode.FIELD_VALIDATOR_FAILED]: "Field '{{field}}' validator '{{validator}}' failed on model '{{model}}'",
  [ErrorCode.FIELD_VALIDATORS_FAILED]: "Field '{{field}}' validators failed on model '{{model}}' with errors:\n{{errors}}",

  // Association errors
  [ErrorCode.ASSOCIATION_INCOMPLETE]: 'You must call .to(...) after .associate({{from}})',
  [ErrorCode.ASSOCIATION_INVALID]: 'Association is invalid for field {{field}} on model {{model}} for value {{value}}',
  [ErrorCode.ASSOCIATION_VALIDATOR_NOT_FOUND]: 'Association validator for field {{field}} on model {{model}} could not be found in registry!',
  
  // Model errors
  [ErrorCode.ID_FIELD_CANNOT_BE_EXCLUDED]: 'ID field cannot be excluded by `except` method',
  [ErrorCode.MODEL_FIELD_VALIDATION_FAILED]: 'Model {{model}} validation failed with errors:\n{{errors}}',
  
  // Context errors
  [ErrorCode.ASYNC_LOCAL_STORAGE_REQUIRES_NODEJS]: 'AsyncLocalStorage requires Node.js environment. Use Context.useGlobalStorage() for browser environments or non-Node.js runtimes.',
  [ErrorCode.CONTEXT_USE_RUN_METHOD]: 'Use Context.run() to set context in async scope',
  [ErrorCode.CONTEXT_AUTO_RESET]: 'Context automatically resets when async scope ends',
  [ErrorCode.ASYNC_LOCAL_STORAGE_SETUP_FAILED]: 'Failed to set up AsyncLocalStorage adapter. This usually means you\'re not in a Node.js environment. Use Context.useGlobalStorage() for browsers',
  [ErrorCode.CONTEXT_ADAPTER_REQUIRED]: 'Context adapter must be explicitly set in Node.js environments to prevent context leaking between requests. Use Context.useAsyncLocalStorage() for proper request isolation, or Context.useGlobalStorage() if you understand the risks.',
};
