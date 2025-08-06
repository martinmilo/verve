const canRules = new WeakMap<object, Record<string, (context: any, model: any) => boolean>>();

export function can(condition: (context: any, model?: any) => boolean) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    let rules = canRules.get(target);
    if (!rules) {
      rules = {};
      canRules.set(target, rules);
    }
    rules[propertyKey] = condition;
    return descriptor;
  };
}

export function getCanCondition(target: any, methodName: string) {
  return canRules.get(target)?.[methodName];
}