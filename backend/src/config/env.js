/**
 * Fail-fast environment validation. Call once at startup (before listening) so a
 * misconfigured deployment crashes with a clear message instead of failing on the
 * first authenticated request.
 */
const MIN_SECRET_LENGTH = 24;

export function validateEnv(env = process.env) {
  const errors = [];
  const warnings = [];

  const secret = env.JWT_SECRET;
  if (!secret) errors.push("JWT_SECRET is not set.");
  else if (secret.length < MIN_SECRET_LENGTH) warnings.push(`JWT_SECRET is shorter than ${MIN_SECRET_LENGTH} characters; use a long random value.`);

  const trusted = env.DB_TRUSTED_CONNECTION === "true";
  if (!trusted && (!env.DB_USER || !env.DB_PASSWORD)) {
    warnings.push("DB_USER/DB_PASSWORD are not set (and DB_TRUSTED_CONNECTION is not true): the database connection will likely fail.");
  }

  if (env.NODE_ENV === "production" && env.DB_TRUST_SERVER_CERTIFICATE !== "false" && env.DB_ENCRYPT === "true") {
    warnings.push("DB_ENCRYPT=true with DB_TRUST_SERVER_CERTIFICATE!=false accepts any server certificate.");
  }
  if (env.SEPAY_USER_TOKEN && !env.SEPAY_API_KEY) {
    warnings.push("SEPAY_USER_TOKEN is set but SEPAY_API_KEY is missing: webhook requests cannot be authenticated.");
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function assertEnv(env = process.env, log = console) {
  const { ok, errors, warnings } = validateEnv(env);
  warnings.forEach((w) => log.warn(`[env] ${w}`));
  if (!ok) {
    errors.forEach((e) => log.error(`[env] ${e}`));
    throw new Error(`Invalid environment configuration:\n - ${errors.join("\n - ")}`);
  }
}
