import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE,
  changeSecurity,
  digest,
  securityEvent,
  sessionCookieOptions,
} from "@/lib/auth";
export async function POST() {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (token)
    await changeSecurity((data) => {
      const user = data.users.find(
        (u) => u.id === data.sessions[digest(token)]?.userId,
      );
      delete data.sessions[digest(token)];
      if (user) securityEvent(data, "logout", user.email);
    });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  return response;
}
