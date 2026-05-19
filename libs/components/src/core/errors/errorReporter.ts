import { AppError, ErrorCode, getErrorMessage } from './AppError';

export type ErrorReporter = (error: AppError) => void;

let activeReporter: ErrorReporter | null = null;

export function setErrorReporter(reporter: ErrorReporter | null): void {
  activeReporter = reporter;
}

export function reportError(
  err: unknown,
  fallbackCode: ErrorCode = ErrorCode.UNKNOWN_ERROR,
  context?: Record<string, unknown>,
): AppError {
  const appError =
    err instanceof AppError
      ? err
      : new AppError({
          code: fallbackCode,
          message:
            err instanceof Error && err.message
              ? err.message
              : getErrorMessage(fallbackCode),
          originalError: err,
          context,
        });

  console.error(`[${appError.code}]`, appError.message, appError.originalError ?? '');

  if (activeReporter) {
    try {
      activeReporter(appError);
    } catch (reporterErr) {
      console.error('[errorReporter] reporter threw:', reporterErr);
    }
  }

  return appError;
}
