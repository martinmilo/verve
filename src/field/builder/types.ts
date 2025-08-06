import { FieldBuilder } from "./FieldBuilder";

type Constructor<T = any> = new (...args: any[]) => T;

export type WithFieldBuilder<T = any> = Constructor<FieldBuilder<T>>;
