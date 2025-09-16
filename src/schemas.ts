import { z } from "zod";

export const NoteCreate = z.object({
  msg: z.string().trim().min(1).max(500)
});
export const NoteId = z.object({
  id: z.coerce.number().int().positive()
});
export type NoteCreateDTO = z.infer<typeof NoteCreate>;
export type NoteIdDTO = z.infer<typeof NoteId>;
