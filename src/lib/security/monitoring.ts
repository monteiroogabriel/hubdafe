import "server-only";
import * as Sentry from '@sentry/nextjs';
// Deliberately report a fixed operational code, never the original exception payload.
export function reportFailure(code:string){
 console.error(JSON.stringify({event:'operation_failed',code,time:new Date().toISOString()}));
 if(process.env.SENTRY_DSN)Sentry.captureException(new Error(code));
}
