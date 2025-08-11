const canRules = new WeakMap<object, Record<string, (context: any, model: any) => any>>();

export function can(condition: (context: any, model?: any) => any) {
  return function (target: any, context?: any): any {
    // Handle new stage 3 decorators (TypeScript 5.0+)
    if (context && typeof context === 'object' && 'kind' in context) {
      const ctx = context as any;
      if (ctx.kind === 'method') {
        const propertyKey = ctx.name;
        const targetObject = target;
        
        let rules = canRules.get(targetObject);
        if (!rules) {
          rules = {};
          canRules.set(targetObject, rules);
        }
        rules[propertyKey] = condition;
        
        return target; // Return the original method for stage 3 decorators
      }
    }
    
    // Handle legacy decorators (experimentalDecorators)
    const propertyKey = context;
    const descriptor = arguments[2];
    const targetObject = typeof target === 'function' ? target.prototype : target;
    
    let rules = canRules.get(targetObject);
    if (!rules) {
      rules = {};
      canRules.set(targetObject, rules);
    }
    rules[propertyKey] = condition;
    
    return descriptor;
  };
}

export function getCanCondition(target: any, methodName: string) {
  return canRules.get(target)?.[methodName];
}