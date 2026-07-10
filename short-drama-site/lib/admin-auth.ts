import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "duanju_admin";
function secret() { return process.env.ADMIN_PASSWORD ?? ""; }
function signature() { return createHmac("sha256", secret()).update("duanju-admin-session").digest("hex"); }

export async function isAdminAuthenticated() {
  if (!secret()) return process.env.NODE_ENV === "development";
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const expected = Buffer.from(signature()); const received = Buffer.from(value);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function setAdminSession() { (await cookies()).set(COOKIE, signature(), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 }); }
export async function clearAdminSession() { (await cookies()).delete(COOKIE); }
export function verifyAdminPassword(value: string) { const expected = secret(); if (!expected) return process.env.NODE_ENV === "development"; const a = Buffer.from(expected); const b = Buffer.from(value); return a.length === b.length && timingSafeEqual(a, b); }
