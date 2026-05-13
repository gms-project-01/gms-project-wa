import { cookies } from "next/headers";

export const SESSION_COOKIE = "agent_session";
const SESSION_TOKEN = "authenticated";

export async function isAuthenticated(request: Request): Promise<boolean> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return false;
  const value = match.slice(SESSION_COOKIE.length + 1);
  return value === SESSION_TOKEN;
}

export function createSession(): string {
  return SESSION_TOKEN;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
