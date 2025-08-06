import { ErrorCode } from "./codes";
import { ErrorRegistry } from "./ErrorRegistry";

export class VerveError extends Error {
  constructor(code: ErrorCode, ...args: any[]) {
    super(VerveError.getMessageWithCode(code, ...args));
  }

  is(code: ErrorCode): boolean {
    return this.message.startsWith(`${code}:`);
  }

  static getMessage(code: ErrorCode, ...args: any[]): string {
    return ErrorRegistry.getMessage(code).replace(/\{\{(.*?)\}\}/g, (_, p1) => {
      const [obj] = args;
      if (obj) {
        return obj[p1] || '';
      }
      return '';
    });
  }

  static getMessageWithCode(code: ErrorCode, ...args: any[]): string {
    if (ErrorRegistry.hasHiddenCodes()) {
      return VerveError.getMessage(code, ...args);
    }
    return `${code}: ${VerveError.getMessage(code, ...args)}`;
  }
}

export class VerveErrorList {
  private readonly errors: { code: ErrorCode, args: any[] }[] = [];

  static new(): VerveErrorList {
    return new VerveErrorList();
  }

  count(): number {
    return this.errors.length;
  }

  add(code: ErrorCode, ...args: any[]): void {
    this.errors.push({ code, args });
  }

  merge(errors: VerveErrorList): void {
    this.errors.push(...errors.errors);
  }

  contains(code: ErrorCode): boolean {
    return this.errors.some(error => error.code === code);
  }

  isEmpty(): boolean {
    return this.errors.length === 0;
  }

  isPresent(): boolean {
    return this.errors.length > 0;
  }

  toErrorMessages(): string[] {
    return this.errors.map(error => VerveError.getMessage(error.code, ...error.args));
  }

  toErrorMessagesWithCode(): string[] {
    return this.errors.map(error => VerveError.getMessageWithCode(error.code, ...error.args));
  }
}