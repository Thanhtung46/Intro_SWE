import { loginSchema } from './loginSchema';

describe('loginSchema', () => {
  it('accepts a valid email/password payload', () => {
    const result = loginSchema.safeParse({ email: 'a@example.com', password: 'anything' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'anything' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.find((i) => i.path[0] === 'email')?.message).toBe('Email is required');
    }
  });

  it('rejects a badly formatted email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'anything' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.find((i) => i.path[0] === 'email')?.message).toBe(
        'Enter a valid email address'
      );
    }
  });

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({ email: 'a@example.com', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.find((i) => i.path[0] === 'password')?.message).toBe(
        'Password is required'
      );
    }
  });
});
