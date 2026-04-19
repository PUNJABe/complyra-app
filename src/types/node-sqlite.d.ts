declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(filename: string);
    exec(sql: string): void;
    prepare(sql: string): {
      run(...params: unknown[]): void;
      get(...params: unknown[]): unknown;
    };
    close(): void;
  }
}
