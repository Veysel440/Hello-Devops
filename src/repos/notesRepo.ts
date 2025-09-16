import { kdb } from "../db.kysely.js";
import type { Selectable, InsertResult } from "kysely";
import type { NotesTable } from "../db.kysely.js";

export const listNotes = (): Promise<Selectable<NotesTable>[]> =>
  kdb.selectFrom("notes")
     .select(["id","msg","created_at"])
     .orderBy("id","desc")
     .limit(50)
     .execute();

export const getNote = (id: number): Promise<Selectable<NotesTable>[]> =>
  kdb.selectFrom("notes")
     .select(["id","msg","created_at"])
     .where("id","=",id)
     .execute();

export const createNote = (msg: string): Promise<InsertResult> =>
  kdb.insertInto("notes")
     .values({ msg })
     .executeTakeFirstOrThrow();

export const updateNote = (id: number, msg: string) =>
  kdb.updateTable("notes")
     .set({ msg })
     .where("id","=",id)
     .executeTakeFirst();

export const deleteNote = (id: number) =>
  kdb.deleteFrom("notes")
     .where("id","=",id)
     .executeTakeFirst();
