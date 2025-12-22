import * as Sentry from '@sentry/nestjs';
import { capitalize } from 'lodash';

export const initializeSentry = (appName: string, allowLogs = false) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return null;
  }

  try {
    let profilingIntegration: Sentry.Integration | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { nodeProfilingIntegration } = require('@sentry/profiling-node');
      profilingIntegration = nodeProfilingIntegration();
    } catch (profilingError) {
      if (allowLogs) {
        console.warn(
          'Sentry profiling disabled:',
          (profilingError as Error)?.message || profilingError
        );
      }
      profilingIntegration = null;
    }
    Sentry.init({
      initialScope: {
        tags: {
          service: appName,
          component: 'nestjs',
        },
        contexts: {
          app: {
            name: `Postiz ${capitalize(appName)}`,
          },
        },
      },
      environment: process.env.NODE_ENV || 'development',
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      integrations: [
        // Add profiling integration if available for the platform
        ...(profilingIntegration ? [profilingIntegration] : []),
        Sentry.consoleLoggingIntegration({ levels: ['log', 'error', 'warn'] }),
      ],
      tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.3,
      enableLogs: true,
    });
  } catch (err) {
    console.log(err);
  }
  return true;
};
