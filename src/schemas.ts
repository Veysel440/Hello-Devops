import { z } from "zod";

export const NoteCreate = z.object({ msg: z.string().min(1).max(255) });
export const NoteId = z.object({ id: z.coerce.number().int().positive() });
export type NoteCreateDTO = z.infer<typeof NoteCreate>;
export type NoteIdDTO = z.infer<typeof NoteId>;

