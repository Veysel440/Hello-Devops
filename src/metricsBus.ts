import type client from "prom-client";

let _dbErr: client.Counter<"op"> | null = null;
export const registerDbErrorCounter = (c: client.Counter<"op">) => { _dbErr = c; };
export const incDbError = (op = "query") => { _dbErr?.inc({ op }); };
