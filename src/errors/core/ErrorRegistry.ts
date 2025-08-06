import { ErrorCode } from './codes';
import { errorMessages } from './message';

export class ErrorRegistry {
  private static customErrorMessages: Partial<Record<ErrorCode, string>> = {};
  private static hiddenCodes = false;

  static register(overrides: Partial<Record<ErrorCode, string>>): void {
    this.customErrorMessages = { ...errorMessages, ...overrides };
  }

  static getMessage(code: ErrorCode): string {
    return this.customErrorMessages[code] || errorMessages[code] || 'Unknown error';
  }

  static hideCodes(): void {
    this.hiddenCodes = true;
  }

  static hasHiddenCodes(): boolean {
    return this.hiddenCodes;
  }
}