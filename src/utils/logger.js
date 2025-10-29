const isDev = process.env.NODE_ENV !== 'production';

function createLogger(namespace) {
  const logAt = (level) => (...messages) => {
    const parts = [`[${level.toUpperCase()}]`];
    if (namespace) parts.push(`[${namespace}]`);
    const fn = level === 'warn' ? console.warn : level === 'error' ? console.error : console.log;
    if (level === 'error' || isDev) fn(...parts, ...messages);
  };

  return {
    info: logAt('info'),
    warn: logAt('warn'),
    error: logAt('error'),
    withNamespace: (ns) => createLogger(namespace ? `${namespace}:${ns}` : ns),
  };
}

export const rootLogger = createLogger();
export const log = rootLogger.info;
export const warn = rootLogger.warn;
export const logError = rootLogger.error;

export default rootLogger;
