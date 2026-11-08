import * as admin from "firebase-admin"
import { cert, initializeApp } from "firebase-admin";
import {serviceAccountKey} from "@sutra/secret"




export const app = initializeApp({
  credential: cert(serviceAccountKey as admin.ServiceAccount),
});