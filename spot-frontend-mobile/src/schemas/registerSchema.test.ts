import { registerSchema } from './registerSchema';

const validBase = {
  name: 'Nguyen Van A',
  email: 'a@example.com',
  phone: '',
  gender: undefined,
  password: 'Abcdef1!',
  confirmPassword: 'Abcdef1!',
};

function fieldMessage(result: ReturnType<typeof registerSchema.safeParse>, field: string) {
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('registerSchema', () => {
  it('accepts a fully valid payload', () => {
    const result = registerSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = registerSchema.safeParse({ ...validBase, name: '' });
    expect(result.success).toBe(false);
    expect(fieldMessage(result, 'name')).toBe('Name is required');
  });

  it('rejects a badly formatted email', () => {
    const result = registerSchema.safeParse({ ...validBase, email: 'not-an-email' });
    expect(result.success).toBe(false);
    expect(fieldMessage(result, 'email')).toBe('Enter a valid email address');
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({ ...validBase, password: 'Ab1!', confirmPassword: 'Ab1!' });
    expect(result.success).toBe(false);
    expect(fieldMessage(result, 'password')).toBe('Password must be at least 8 characters');
  });

  it('rejects a password missing an uppercase letter', () => {
    const result = registerSchema.safeParse({ ...validBase, password: 'abcdefg1!', confirmPassword: 'abcdefg1!' });
    expect(result.success).toBe(false);
    expect(fieldMessage(result, 'password')).toBe('Password must include an uppercase letter');
  });

  it('rejects a password missing a lowercase letter', () => {
    const result = registerSchema.safeParse({ ...validBase, password: 'ABCDEFG1!', confirmPassword: 'ABCDEFG1!' });
    expect(result.success).toBe(false);
    expect(fieldMessage(result, 'password')).toBe('Password must include a lowercase letter');
  });

  it('rejects a password missing a number', () => {
    const result = registerSchema.safeParse({ ...validBase, password: 'Abcdefgh!', confirmPassword: 'Abcdefgh!' });
    expect(result.success).toBe(false);
    expect(fieldMessage(result, 'password')).toBe('Password must include a number');
  });

  it('rejects a password missing a special character', () => {
    const result = registerSchema.safeParse({ ...validBase, password: 'Abcdefg1', confirmPassword: 'Abcdefg1' });
    expect(result.success).toBe(false);
    expect(fieldMessage(result, 'password')).toBe('Password must include a special character');
  });

  it('rejects mismatched confirmPassword', () => {
    const result = registerSchema.safeParse({ ...validBase, password: 'Abcdef1!', confirmPassword: 'Different1!' });
    expect(result.success).toBe(false);
    expect(fieldMessage(result, 'confirmPassword')).toBe('Passwords do not match');
  });
});
