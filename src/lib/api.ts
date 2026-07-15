"use client";

import { auth } from "@/lib/firebase/client";

/** fetch() with the current user's Firebase ID token attached as a Bearer header. */
export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");
  const idToken = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${idToken}`);
  return fetch(input, { ...init, headers });
}
