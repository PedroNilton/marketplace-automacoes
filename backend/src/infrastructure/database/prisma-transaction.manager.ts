import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../application/ports/transaction-manager';
import { PrismaExecutionContext } from './prisma-execution-context';

@Injectable()
export class PrismaTransactionManager extends TransactionManager {
  constructor(private readonly context: PrismaExecutionContext) {
    super();
  }

  run<T>(operation: () => Promise<T>): Promise<T> {
    return this.context.runInTransaction(operation);
  }
}
