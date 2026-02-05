export enum ErrorCode {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_USER_NOT_FOUND = 'AUTH_USER_NOT_FOUND',
  AUTH_EMAIL_IN_USE = 'AUTH_EMAIL_IN_USE',
  AUTH_WEAK_PASSWORD = 'AUTH_WEAK_PASSWORD',
  AUTH_NETWORK_ERROR = 'AUTH_NETWORK_ERROR',
  AUTH_POPUP_CLOSED = 'AUTH_POPUP_CLOSED',
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',

  // Project errors
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  PROJECT_ACCESS_DENIED = 'PROJECT_ACCESS_DENIED',
  PROJECT_SAVE_FAILED = 'PROJECT_SAVE_FAILED',
  PROJECT_DELETE_FAILED = 'PROJECT_DELETE_FAILED',

  // Collaboration errors
  COLLAB_USER_NOT_FOUND = 'COLLAB_USER_NOT_FOUND',
  COLLAB_ALREADY_MEMBER = 'COLLAB_ALREADY_MEMBER',
  COLLAB_SYNC_FAILED = 'COLLAB_SYNC_FAILED',

  // Deployment errors
  DEPLOY_CONNECTION_FAILED = 'DEPLOY_CONNECTION_FAILED',
  DEPLOY_AUTH_FAILED = 'DEPLOY_AUTH_FAILED',
  DEPLOY_COMMAND_FAILED = 'DEPLOY_COMMAND_FAILED',

  // General errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppErrorOptions {
  code: ErrorCode;
  message: string;
  originalError?: unknown;
  context?: Record<string, unknown>;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly originalError?: unknown;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.originalError = options.originalError;
    this.context = options.context;
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

// Helper function to get user-friendly error messages
export function getErrorMessage(code: ErrorCode): string {
  const messages: Record<ErrorCode, string> = {
    [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password. Please try again.',
    [ErrorCode.AUTH_USER_NOT_FOUND]: 'No account found with this email address.',
    [ErrorCode.AUTH_EMAIL_IN_USE]: 'This email is already registered. Try signing in instead.',
    [ErrorCode.AUTH_WEAK_PASSWORD]: 'Password is too weak. Use at least 6 characters.',
    [ErrorCode.AUTH_NETWORK_ERROR]: 'Network error. Please check your connection.',
    [ErrorCode.AUTH_POPUP_CLOSED]: 'Sign-in was cancelled. Please try again.',
    [ErrorCode.AUTH_UNAUTHORIZED]: 'You are not authorized to perform this action.',

    [ErrorCode.PROJECT_NOT_FOUND]: 'Project not found. It may have been deleted.',
    [ErrorCode.PROJECT_ACCESS_DENIED]: 'You do not have access to this project.',
    [ErrorCode.PROJECT_SAVE_FAILED]: 'Failed to save project. Please try again.',
    [ErrorCode.PROJECT_DELETE_FAILED]: 'Failed to delete project. Please try again.',

    [ErrorCode.COLLAB_USER_NOT_FOUND]: 'User not found with this email address.',
    [ErrorCode.COLLAB_ALREADY_MEMBER]: 'This user is already a member of the project.',
    [ErrorCode.COLLAB_SYNC_FAILED]: 'Failed to sync changes. Please refresh the page.',

    [ErrorCode.DEPLOY_CONNECTION_FAILED]: 'Failed to connect to the server.',
    [ErrorCode.DEPLOY_AUTH_FAILED]: 'Authentication failed. Check your credentials.',
    [ErrorCode.DEPLOY_COMMAND_FAILED]: 'Command execution failed on the server.',

    [ErrorCode.NETWORK_ERROR]: 'Network error. Please check your connection.',
    [ErrorCode.VALIDATION_ERROR]: 'Invalid input. Please check your data.',
    [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
  };

  return messages[code] || messages[ErrorCode.UNKNOWN_ERROR];
}

// Map Firebase error codes to AppError codes
export function mapFirebaseError(firebaseError: { code?: string; message?: string }): AppError {
  const firebaseCode = firebaseError.code || '';

  const codeMap: Record<string, ErrorCode> = {
    'auth/invalid-credential': ErrorCode.AUTH_INVALID_CREDENTIALS,
    'auth/invalid-email': ErrorCode.AUTH_INVALID_CREDENTIALS,
    'auth/wrong-password': ErrorCode.AUTH_INVALID_CREDENTIALS,
    'auth/user-not-found': ErrorCode.AUTH_USER_NOT_FOUND,
    'auth/email-already-in-use': ErrorCode.AUTH_EMAIL_IN_USE,
    'auth/weak-password': ErrorCode.AUTH_WEAK_PASSWORD,
    'auth/network-request-failed': ErrorCode.AUTH_NETWORK_ERROR,
    'auth/popup-closed-by-user': ErrorCode.AUTH_POPUP_CLOSED,
    'auth/cancelled-popup-request': ErrorCode.AUTH_POPUP_CLOSED,
    'permission-denied': ErrorCode.PROJECT_ACCESS_DENIED,
    'not-found': ErrorCode.PROJECT_NOT_FOUND,
  };

  const errorCode = codeMap[firebaseCode] || ErrorCode.UNKNOWN_ERROR;

  return new AppError({
    code: errorCode,
    message: getErrorMessage(errorCode),
    originalError: firebaseError,
  });
}
