import { Model } from "./Model";

export function makeFieldInstanceKey(key: string): `$${string}` {
  if (key.startsWith('$')) {
    return key as `$${string}`;
  }
  return `$${key}` as `$${string}`;
}

export function getBaseModelMethods(ModelClass: typeof Model): Set<string> {
  const modelMethods = new Set<string>();
  const ownPropertyNames = Object.getOwnPropertyNames(ModelClass.prototype);
  
  for (const name of ownPropertyNames) {
    if (name !== 'constructor') {
      const descriptor = Object.getOwnPropertyDescriptor(ModelClass.prototype, name);

      if (descriptor && typeof descriptor.value === 'function') {
        modelMethods.add(name);
      }
    }
  }
  return modelMethods;
}

export function deepClone(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}
