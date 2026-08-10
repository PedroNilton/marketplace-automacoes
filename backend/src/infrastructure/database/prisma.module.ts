import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TransactionManager } from '../../application/ports/transaction-manager';
import { PrismaErrorMapper } from './prisma-error.mapper';
import { PrismaExecutionContext } from './prisma-execution-context';
import { PrismaService } from './prisma.service';
import { PrismaTransactionManager } from './prisma-transaction.manager';

@Module({
  imports: [ConfigModule],
  providers: [
    PrismaService,
    PrismaErrorMapper,
    PrismaExecutionContext,
    PrismaTransactionManager,
    {
      provide: TransactionManager,
      useExisting: PrismaTransactionManager,
    },
  ],
  exports: [PrismaService, PrismaExecutionContext, TransactionManager],
})
export class PrismaModule {}
