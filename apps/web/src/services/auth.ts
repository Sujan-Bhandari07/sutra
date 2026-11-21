import type { User } from "@/types";
import { signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { getFirebaseAuth, getGoogleProvider, isFirebaseConfigured } from "@/utils/Firebase";
export { isFirebaseConfigured };

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export class AuthNotConfiguredError extends Error {
  constructor() {
    super("Google sign-in needs a Firebase web API key in the web environment.");
    this.name = "AuthNotConfiguredError";
  }
}

export class AuthBackendError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "AuthBackendError";
  }
}

function firebaseAuth() {
  if (!isFirebaseConfigured()) throw new AuthNotConfiguredError();
  return getFirebaseAuth();
}

function mapUser(user: any): User {
  return { id: String(user._id ?? user.id), name: user.fullname ?? user.name ?? "", email: user.email, photoUrl: user.profilepic ?? user.photoUrl };
}

async function handleAuthResponse(response: Response): Promise<any> {
  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new AuthBackendError("The authentication service returned an invalid response.", response.status);
  }

  if (!response.ok) {
    const message = data?.message ?? "The authentication service is temporarily unavailable.";
    throw new AuthBackendError(message, response.status);
  }

  return data;
}

export async function signInWithGoogle(): Promise<User> {
  const auth = firebaseAuth();
  const result = await signInWithPopup(auth, getGoogleProvider());
  const token = await result.user.getIdToken();
  const response = await fetch(`${API}/users/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const data = await handleAuthResponse(response);
  return mapUser(data.payload);
}

export async function signOut(): Promise<void> {
  try {
    await fetch(`${API}/users/logout`, { method: "POST", credentials: "include" });
  } finally {
    if (isFirebaseConfigured()) await firebaseSignOut(firebaseAuth());
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch(`${API}/users/getprofile`, { credentials: "include", cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json();
    return mapUser(data.payload);
  } catch { return null; }
}