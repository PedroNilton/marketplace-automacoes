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
    const directFields = this.readStringList(error.meta?.target);

    if (directFields.length > 0) {
      return directFields;
    }

    const adapterError = error.meta?.driverAdapterError;

    if (!this.isRecord(adapterError) || !this.isRecord(adapterError.cause)) {
      return [];
    }

    const constraint = adapterError.cause.constraint;

    return this.isRecord(constraint)
      ? this.readStringList(constraint.fields)
      : [];
  }

  private readStringList(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter(
        (field): field is string => typeof field === 'string',
      );
    }

    return typeof value === 'string' ? [value] : [];
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
