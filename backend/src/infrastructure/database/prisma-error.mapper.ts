import { Injectable } from '@nestjs/common';
import { UniqueConstraintViolationError } from '../../application/errors/unique-constraint-violation.error';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class PrismaErrorMapper {
  rethrow(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new UniqueConstraintViolationError(this.readFields(error), {
        cause: error,
      });
    }

    throw error;
  }

  private readFields(error: Prisma.PrismaClientKnownRequestError): string[] {
    const target = error.meta?.target;

    if (Array.isArray(target)) {
      return target.filter(
        (field): field is string => typeof field === 'string',
      );
    }

    return typeof target === 'string' ? [target] : [];
  }
}
