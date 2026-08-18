import { z } from 'zod';
import { RequestValidationError } from './request-validation.error';
import { ZodBodyPipe } from './zod-body.pipe';

describe('ZodBodyPipe', () => {
  const pipe = new ZodBodyPipe(z.object({ email: z.string().min(1) }).strict());

  it('returns a structurally valid payload without coercion', () => {
    expect(pipe.transform({ email: 'ana@example.com' })).toEqual({
      email: 'ana@example.com',
    });
  });

  it.each([
    [{ email: 123 }, 'email', 'invalid_value'],
    [{ email: 'ana@example.com', admin: true }, 'body', 'unexpected_field'],
  ])('rejects unsafe payload %p with safe issues', (payload, field, code) => {
    expect.assertions(2);

    try {
      pipe.transform(payload);
    } catch (error) {
      expect(error).toBeInstanceOf(RequestValidationError);
      expect((error as RequestValidationError).issues).toContainEqual(
        expect.objectContaining({ field, code }),
      );
    }
  });
});
