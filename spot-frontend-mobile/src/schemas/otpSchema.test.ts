import { otpSchema } from './otpSchema';

describe('otpSchema', () => {
  it('accepts a 6-digit code', () => {
    const result = otpSchema.safeParse('123456');
    expect(result.success).toBe(true);
  });

  it('rejects an empty value', () => {
    const result = otpSchema.safeParse('');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('OTP must be exactly 6 digits');
    }
  });

  it('rejects a code shorter than 6 digits', () => {
    const result = otpSchema.safeParse('12345');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('OTP must be exactly 6 digits');
    }
  });

  it('rejects a code longer than 6 digits', () => {
    const result = otpSchema.safeParse('1234567');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('OTP must be exactly 6 digits');
    }
  });

  it('rejects non-digit characters', () => {
    const result = otpSchema.safeParse('12a45b');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('OTP must be exactly 6 digits');
    }
  });
});
