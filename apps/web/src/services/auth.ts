import type { User } from "@/types";
import { MOCK_USER } from "./mock-data";
import { sleep } from "@/lib/utils";

/**
 * Authentication service.
 *
 * Google sign-in is not wired up yet. When you add Firebase:
 *   1. Fill in the NEXT_PUBLIC_FIREBASE_* variables (see .env.example).
 *   2. Replace the body of `signInWithGoogle` with
 *      `signInWithPopup(auth, new GoogleAuthProvider())`.
 */

export class AuthNotConfiguredError extends Error {
  constructor() {
    super("Google sign-in isn't set up yet. Add your Firebase keys to .env.local and restart the dev server.");
    this.name = "AuthNotConfiguredError";
  }
}

export function isFirebaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
}

export async function signInWithGoogle(): Promise<User> {
  await sleep(700);
  if (!isFirebaseConfigured()) throw new AuthNotConfiguredError();
  // Firebase is configured but the SDK is not installed in this frontend yet.
  throw new Error("Firebase keys were found, but the Firebase SDK call hasn't been added to services/auth.ts.");
}

export async function signOut(): Promise<void> {
  await sleep(200);
}

/** Placeholder profile used by the demo workspace until real auth exists. */
export async function getCurrentUser(): Promise<User> {
  return MOCK_USER;
}
