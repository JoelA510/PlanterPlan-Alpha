const formatMessage = (level, namespace, messages) => {
  const prefix = namespace ? `[${namespace}]` : '';
  return [`[${level.toUpperCase()}]`, prefix, ...messages].filter(Boolean);
};

const createLogger = (namespace) => {
  const logAtLevel = (level) => (...messages) => {
    // eslint-disable-next-line no-console
    console[level](...formatMessage(level, namespace, messages));
  };

  return {
    info: logAtLevel('info'),
    warn: logAtLevel('warn'),
    error: logAtLevel('error')
  };
};

const rootLogger = createLogger('PlanterPlan');

rootLogger.withNamespace = (namespace) => createLogger(namespace);

export default rootLogger;
