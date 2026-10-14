export class HttpError extends Error { constructor(status,message,code='error'){ super(message); this.status=status; this.code=code; } }
export const asyncRoute = fn => (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
export const ipOf = req => (req.ip || req.socket?.remoteAddress || '').replace(/^::ffff:/,'');
