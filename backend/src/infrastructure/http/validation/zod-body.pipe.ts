import { Injectable, PipeTransform } from '@nestjs/common';
import { z } from 'zod';
import {
  RequestValidationError,
  RequestValidationIssue,
} from './request-validation.error';

@Injectable()
export class ZodBodyPipe<TSchema extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.output<TSchema> {
    const result = this.schema.safeParse(value);

    if (result.success) {
      return result.data;
    }

    throw new RequestValidationError(result.error.issues.map(toSafeIssue));
  }
}

function toSafeIssue(issue: z.core.$ZodIssue): RequestValidationIssue {
  return {
    field: issue.path.length > 0 ? issue.path.join('.') : 'body',
    code:
      issue.code === 'unrecognized_keys' ? 'unexpected_field' : 'invalid_value',
    message:
      issue.code === 'unrecognized_keys'
        ? 'Remova os campos não reconhecidos.'
        : 'Informe um valor válido.',
  };
}
