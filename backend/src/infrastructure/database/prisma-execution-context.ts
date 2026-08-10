import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma } from '../../generated/prisma/client';
import { PrismaErrorMapper } from './prisma-error.mapper';
import { PrismaService } from './prisma.service';

export type PrismaDatabaseClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class PrismaExecutionContext {
  private readonly transactions =
    new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly errorMapper: PrismaErrorMapper,
  ) {}

  async runInTransaction<T>(operation: () => Promise<T>): Promise<T> {
    if (this.transactions.getStore()) {
      return operation();
    }

    try {
      return await this.prisma.$transaction((transaction) =>
        this.transactions.run(transaction, operation),
      );
    } catch (error) {
      return this.errorMapper.rethrow(error);
    }
  }

  async execute<T>(
    operation: (client: PrismaDatabaseClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await operation(this.transactions.getStore() ?? this.prisma);
    } catch (error) {
      return this.errorMapper.rethrow(error);
    }
  }
}
