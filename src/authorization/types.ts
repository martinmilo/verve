export type WithAuthorizationInstance<T = unknown> = {
  runAuthorized<K extends {
    [P in keyof T]: T[P] extends (...args: any[]) => any ? P : never
  }[keyof T]>(
    method: K,
    ...args: T[K] extends (...args: any[]) => any ? Parameters<T[K]> : never
  ): T[K] extends (...args: any[]) => any ? ReturnType<T[K]> : never;
};