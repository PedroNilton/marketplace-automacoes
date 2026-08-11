export interface PasswordBlocklist {
  contains(password: string): boolean;
}
