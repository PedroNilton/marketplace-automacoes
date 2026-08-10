import {
  PrismaDatabaseClient,
  PrismaExecutionContext,
} from './prisma-execution-context';

export abstract class PrismaRepository {
  protected constructor(private readonly context: PrismaExecutionContext) {}

  protected execute<T>(
    operation: (client: PrismaDatabaseClient) => Promise<T>,
  ): Promise<T> {
    return this.context.execute(operation);
  }
}
