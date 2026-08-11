import { resetPasswordSchema } from './resetPasswordSchema';

const validBase = {
  otp: '123456',
  newPassword: 'Abcdef1!',
  confirmPassword: 'Abcdef1!',
};

function fieldMessage(result: ReturnType<typeof resetPasswordSchema.safeParse>, field: string) {
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('resetPasswordSchema', () => {
  it('accepts a fully valid payload', () => {
    const result = resetPasswordSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('rejects an otp that is not 6 digits', () => {
    const result = resetPasswordSchema.safeParse({ ...validBase, otp: '123' });
    expect(result.success).toBe(false);
    expect(fieldMessage(result, 'otp')).toBe('OTP must be exactly 6 digits');
  });

  it('rejects a newPassword shorter than 8 characters', () => {
    const result = resetPasswordSchema.safeParse({
      ...validBase,
      newPassword: 'Ab1!',
      confirmPassword: 'Ab1!',
    });
    expect(result.success).toBe(false);
    expect(fieldMessage(result, 'newPassword')).toBe('Password must be at least 8 characters');
  });

  it('rejects a newPassword missing a special character', () => {
    const result = resetPasswordSchema.safeParse({
      ...validBase,
      newPassword: 'Abcdefg1',
      confirmPassword: 'Abcdefg1',
    });
    expect(result.success).toBe(false);
    expect(fieldMessage(result, 'newPassword')).toBe('Password must include a special character');
  });

  it('rejects mismatched confirmPassword', () => {
    const result = resetPasswordSchema.safeParse({
      ...validBase,
      confirmPassword: 'Different1!',
    });
    expect(result.success).toBe(false);
    expect(fieldMessage(result, 'confirmPassword')).toBe('Passwords do not match');
  });
});
