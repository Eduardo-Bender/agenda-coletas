import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";

export const SESSION_COOKIE_NAME = "agenda_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  email: string;
  expiresAt: number;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function isAuthConfigured() {
  return Boolean(
    process.env.ADMIN_EMAIL?.trim() &&
      process.env.ADMIN_PASSWORD &&
      getAuthSecret()
  );
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function safeCompare(left: string, right: string) {
  return timingSafeEqual(digest(left), digest(right));
}

export function verifyCredentials(email: string, password: string) {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const configuredPassword = process.env.ADMIN_PASSWORD;

  if (!configuredEmail || !configuredPassword || !getAuthSecret()) {
    return false;
  }

  return (
    safeCompare(email.trim().toLowerCase(), configuredEmail) &&
    safeCompare(password, configuredPassword)
  );
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSessionToken(email: string) {
  const secret = getAuthSecret();
  if (!secret) {
    throw new Error("AUTH_SECRET precisa ter pelo menos 32 caracteres.");
  }

  const payload: SessionPayload = {
    email,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  const secret = getAuthSecret();
  if (!token || !secret) {
    return null;
  }

  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra !== undefined) {
    return null;
  }

  const expectedSignature = sign(encodedPayload, secret);
  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as Partial<SessionPayload>;

    if (
      typeof payload.email !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return { email: payload.email, expiresAt: payload.expiresAt };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  await connection();
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  return session ? { email: session.email } : null;
}
