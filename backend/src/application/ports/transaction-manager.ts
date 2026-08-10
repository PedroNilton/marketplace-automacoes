export abstract class TransactionManager {
  abstract run<T>(operation: () => Promise<T>): Promise<T>;
}
