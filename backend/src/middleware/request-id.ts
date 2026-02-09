import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Assigns a unique request ID to every incoming request.
 *
 * - If the client supplies an `X-Request-Id` header, it is reused (useful for
 *   distributed tracing across services).
 * - Otherwise a new UUID v4 is generated.
 *
 * The ID is stored on `req.requestId` and echoed back via the
 * `X-Request-Id` response header.
 */
export function requestId(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.headers['x-request-id'];
  const id =
    typeof incoming === 'string' && incoming.length > 0
      ? incoming
      : uuidv4();

  req.requestId = id;
  res.setHeader('X-Request-Id', id);

  next();
}
