export function isObjectEqual(a: any, b: any): boolean {
  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  const foundDiff = aKeys.find((key) => {
    const aValue = a[key];
    const bValue = b[key];

    if (typeof aValue !== typeof bValue) {
      return true;
    }

    if (Array.isArray(aValue) && Array.isArray(bValue)) {
      return !isArrayEqual(aValue, bValue);
    }

    if (typeof aValue === 'object' && typeof bValue === 'object') {
      return !isObjectEqual(aValue, bValue);
    }

    return aValue !== bValue;
  });

  return foundDiff === undefined;
}

export function isArrayEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const sortedA = a.sort();
  const sortedB = b.sort();

  return sortedA.every((item, index) => {
    if (typeof item !== typeof sortedB[index]) {
      return false;
    }

    if (typeof item === 'object' && typeof sortedB[index] === 'object') {
      return isObjectEqual(item, sortedB[index]);
    }

    if (Array.isArray(item) && Array.isArray(sortedB[index])) {
      return isArrayEqual(item, sortedB[index]);
    }

    return item === sortedB[index];
  });
}