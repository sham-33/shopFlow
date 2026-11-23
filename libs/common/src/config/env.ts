export interface ReadEnvOptions {
  /**
   * Value to use when the variable is missing, outside production. Lets
   * `npm run start:dev` work against the local Docker stack with no setup,
   * while production still refuses to start without the variable.
   */
  devDefault?: string;
}

/** Reads a required environment variable. Throws if it is missing. */
export function readEnv(
  name: string,
  { devDefault }: ReadEnvOptions = {},
): string {
  const value = process.env[name];
  if (value !== undefined && value !== '') {
    return value;
  }
  if (devDefault !== undefined && process.env.NODE_ENV !== 'production') {
    return devDefault;
  }
  throw new Error(`Missing required environment variable ${name}`);
}
