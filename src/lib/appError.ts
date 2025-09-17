export class AppError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, status = 400, msg?: string, details?: unknown) {
    super(msg ?? code);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
export const BadRequest   = (code = "bad_request", d?: unknown) => new AppError(code, 400, undefined, d);
export const Unauthorized = (code = "unauthorized", d?: unknown) => new AppError(code, 401, undefined, d);
export const Forbidden    = (code = "forbidden", d?: unknown) => new AppError(code, 403, undefined, d);
export const NotFound     = (code = "not_found", d?: unknown) => new AppError(code, 404, undefined, d);
export const Conflict     = (code = "conflict", d?: unknown) => new AppError(code, 409, undefined, d);
export const Internal     = (code = "internal_error", d?: unknown) => new AppError(code, 500, undefined, d);
