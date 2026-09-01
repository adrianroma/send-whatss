import bcrypt from "bcryptjs";

/**
 * Single demo user backed by env vars. Swap this for a real database lookup
 * when this project grows beyond a sample/demo.
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<boolean> {
  const validEmail = process.env.AUTH_USER_EMAIL;
  const passwordHash = process.env.AUTH_USER_PASSWORD_HASH;

  if (!validEmail || !passwordHash) {
    throw new Error(
      "AUTH_USER_EMAIL / AUTH_USER_PASSWORD_HASH environment variables are not set"
    );
  }

  if (email.trim().toLowerCase() !== validEmail.toLowerCase()) {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
}
