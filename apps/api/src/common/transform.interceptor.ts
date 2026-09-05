import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessShape {
  success: true;
  data: unknown;
  meta?: unknown;
}

/** Wraps controller responses in `{ success: true, data }`. */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<SuccessShape> {
    return next.handle().pipe(
      map((payload) => {
        // Allow endpoints to return a fully-formed envelope.
        if (payload && typeof payload === 'object' && 'success' in payload) {
          return payload;
        }
        if (payload && typeof payload === 'object' && 'data' in payload && 'meta' in payload) {
          return { success: true, data: payload.data, meta: payload.meta };
        }
        return { success: true, data: payload };
      }),
    );
  }
}
