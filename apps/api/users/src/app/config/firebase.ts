import * as admin from "firebase-admin"
import { cert, initializeApp } from "firebase-admin";
import { getApps } from "firebase-admin/app";
import { serviceAccountKey } from "@sutra/secret";

export function getFirebaseApp() {
  if (getApps().length) return getApps()[0];
  return initializeApp({ credential: cert(serviceAccountKey as admin.ServiceAccount) });
}