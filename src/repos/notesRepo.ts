import { q } from "../db.js";

export const listNotes = () =>
  q("SELECT id,msg,created_at FROM notes ORDER BY id DESC LIMIT 50");

export const getNote = (id: number) =>
  q<any[]>("SELECT id,msg,created_at FROM notes WHERE id=?", [id], "select_one");

export const createNote = (msg: string) =>
  q<any>("INSERT INTO notes(msg) VALUES (?)", [msg], "insert");

export const updateNote = (id: number, msg: string) =>
  q<any>("UPDATE notes SET msg=? WHERE id=?", [msg, id], "update");

export const deleteNote = (id: number) =>
  q<any>("DELETE FROM notes WHERE id=?", [id], "delete");
