export function parseEnvsFromQuery(query: any): Record<string, string> {
  if (!query) {
    return {};
  }

  const queryParams = Object.entries<string>(query).filter(([key]) =>
    key.startsWith("env")
  );
  const envsMap: Record<string, string> = {};

  queryParams.forEach(([_, queryValue]) => {
    const [envKey, envValue] = queryValue.split(":");
    envsMap[envKey] = envValue;
  });
  return envsMap;
}
