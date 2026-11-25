import * as Sentry from '@sentry/nextjs';
export async function register(){
 if(!process.env.SENTRY_DSN)return;
 Sentry.init({dsn:process.env.SENTRY_DSN,environment:process.env.SENTRY_ENVIRONMENT||'development',release:process.env.SENTRY_RELEASE,
  tracesSampleRate:0,defaultIntegrations:false,
  beforeSend(event){
   delete event.user;delete event.request;delete event.breadcrumbs;delete event.extra;delete event.contexts;
   // Error strings from SQL, HTTP clients or form submissions can contain personal data.
   event.message='Server operation failed';
   if(event.exception?.values)event.exception.values=event.exception.values.map(v=>({type:v.type,value:'Server operation failed',stacktrace:v.stacktrace}));
   return event;
  },
 });
}
