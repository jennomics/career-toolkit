declare module "better-sqlite3" {
  interface Database {
    prepare(sql: string): Statement;
    close(): void;
  }

  interface Statement {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): { changes: number; lastInsertRowid: number };
  }

  interface DatabaseConstructor {
    new (filename: string, options?: { readonly?: boolean }): Database;
  }

  const Database: DatabaseConstructor;
  export default Database;
}
