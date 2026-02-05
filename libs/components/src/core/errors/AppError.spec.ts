import { AppError, ErrorCode, getErrorMessage, mapFirebaseError } from './AppError';

describe('AppError', () => {
  describe('constructor', () => {
    it('should create an error with all properties', () => {
      const error = new AppError({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS,
        message: 'Test message',
        originalError: new Error('Original'),
        context: { userId: '123' },
      });

      expect(error.code).toBe(ErrorCode.AUTH_INVALID_CREDENTIALS);
      expect(error.message).toBe('Test message');
      expect(error.originalError).toBeDefined();
      expect(error.context).toEqual({ userId: '123' });
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe('AppError');
    });

    it('should create an error without optional properties', () => {
      const error = new AppError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Simple error',
      });

      expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(error.message).toBe('Simple error');
      expect(error.originalError).toBeUndefined();
      expect(error.context).toBeUndefined();
    });
  });

  describe('toJSON', () => {
    it('should serialize error to JSON', () => {
      const error = new AppError({
        code: ErrorCode.PROJECT_NOT_FOUND,
        message: 'Project not found',
        context: { projectId: 'abc' },
      });

      const json = error.toJSON();

      expect(json.name).toBe('AppError');
      expect(json.code).toBe(ErrorCode.PROJECT_NOT_FOUND);
      expect(json.message).toBe('Project not found');
      expect(json.context).toEqual({ projectId: 'abc' });
      expect(json.timestamp).toBeDefined();
    });
  });
});

describe('getErrorMessage', () => {
  it('should return correct message for AUTH_INVALID_CREDENTIALS', () => {
    expect(getErrorMessage(ErrorCode.AUTH_INVALID_CREDENTIALS)).toBe(
      'Invalid email or password. Please try again.'
    );
  });

  it('should return correct message for PROJECT_NOT_FOUND', () => {
    expect(getErrorMessage(ErrorCode.PROJECT_NOT_FOUND)).toBe(
      'Project not found. It may have been deleted.'
    );
  });

  it('should return correct message for COLLAB_USER_NOT_FOUND', () => {
    expect(getErrorMessage(ErrorCode.COLLAB_USER_NOT_FOUND)).toBe(
      'User not found with this email address.'
    );
  });

  it('should return unknown error message for undefined codes', () => {
    // @ts-expect-error - testing invalid code
    expect(getErrorMessage('INVALID_CODE')).toBe(
      'An unexpected error occurred. Please try again.'
    );
  });
});

describe('mapFirebaseError', () => {
  it('should map auth/invalid-credential to AUTH_INVALID_CREDENTIALS', () => {
    const firebaseError = { code: 'auth/invalid-credential' };
    const appError = mapFirebaseError(firebaseError);

    expect(appError.code).toBe(ErrorCode.AUTH_INVALID_CREDENTIALS);
  });

  it('should map auth/user-not-found to AUTH_USER_NOT_FOUND', () => {
    const firebaseError = { code: 'auth/user-not-found' };
    const appError = mapFirebaseError(firebaseError);

    expect(appError.code).toBe(ErrorCode.AUTH_USER_NOT_FOUND);
  });

  it('should map auth/email-already-in-use to AUTH_EMAIL_IN_USE', () => {
    const firebaseError = { code: 'auth/email-already-in-use' };
    const appError = mapFirebaseError(firebaseError);

    expect(appError.code).toBe(ErrorCode.AUTH_EMAIL_IN_USE);
  });

  it('should map auth/weak-password to AUTH_WEAK_PASSWORD', () => {
    const firebaseError = { code: 'auth/weak-password' };
    const appError = mapFirebaseError(firebaseError);

    expect(appError.code).toBe(ErrorCode.AUTH_WEAK_PASSWORD);
  });

  it('should map auth/popup-closed-by-user to AUTH_POPUP_CLOSED', () => {
    const firebaseError = { code: 'auth/popup-closed-by-user' };
    const appError = mapFirebaseError(firebaseError);

    expect(appError.code).toBe(ErrorCode.AUTH_POPUP_CLOSED);
  });

  it('should map unknown codes to UNKNOWN_ERROR', () => {
    const firebaseError = { code: 'unknown/error' };
    const appError = mapFirebaseError(firebaseError);

    expect(appError.code).toBe(ErrorCode.UNKNOWN_ERROR);
  });

  it('should handle errors without code', () => {
    const firebaseError = { message: 'Some error' };
    const appError = mapFirebaseError(firebaseError);

    expect(appError.code).toBe(ErrorCode.UNKNOWN_ERROR);
  });
});
