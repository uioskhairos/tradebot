import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import type {
  BotConfigurationDraft,
  BotInstance,
  ExchangeCredentialDraft,
  TradeLedgerEntry,
  UserProfile,
} from "@/lib/trading-types";
import { getFirebaseClientServices } from "./client";

type Unsubscribe = () => void;

export function subscribeToAuthState(onChange: (user: User | null) => void): Unsubscribe {
  const services = getFirebaseClientServices();

  if (!services) {
    onChange(null);
    return () => undefined;
  }

  return onAuthStateChanged(services.auth, onChange);
}

export async function signInWithGoogle() {
  try {
    const services = getRequiredServices();
    const credential = await signInWithPopup(services.auth, new GoogleAuthProvider());
    await upsertUserProfile(credential.user);
    return credential.user;
  } catch (error) {
    throw toFriendlyFirebaseError(error);
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const services = getRequiredServices();
    const credential = await signInWithEmailAndPassword(services.auth, email, password);
    await upsertUserProfile(credential.user);
    return credential.user;
  } catch (error) {
    throw toFriendlyFirebaseError(error);
  }
}

export async function registerWithEmail(email: string, password: string) {
  try {
    const services = getRequiredServices();
    const credential = await createUserWithEmailAndPassword(services.auth, email, password);
    await upsertUserProfile(credential.user);
    return credential.user;
  } catch (error) {
    throw toFriendlyFirebaseError(error);
  }
}

export async function signOutCurrentUser() {
  const services = getRequiredServices();
  await signOut(services.auth);
}

export async function upsertUserProfile(user: User) {
  const services = getRequiredServices();
  const userRef = doc(services.db, "users", user.uid);
  const existingProfile = await getDoc(userRef);

  if (!existingProfile.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      currency: "USD",
      feeWalletBalance: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await updateDoc(userRef, {
    email: user.email,
    displayName: user.displayName,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToUserProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void,
): Unsubscribe {
  const services = getFirebaseClientServices();

  if (!services) {
    onChange(null);
    return () => undefined;
  }

  return onSnapshot(doc(services.db, "users", uid), (snapshot) => {
    onChange(snapshot.exists() ? ({ uid, ...snapshot.data() } as UserProfile) : null);
  });
}

export function subscribeToBotInstances(
  uid: string,
  onChange: (bots: BotInstance[]) => void,
): Unsubscribe {
  const services = getFirebaseClientServices();

  if (!services) {
    onChange([]);
    return () => undefined;
  }

  const botQuery = query(
    collection(services.db, "users", uid, "botInstances"),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(botQuery, (snapshot) => {
    onChange(snapshot.docs.map((botDoc) => ({ id: botDoc.id, ...botDoc.data() }) as BotInstance));
  });
}

export function subscribeToTradeLedger(
  uid: string,
  onChange: (entries: TradeLedgerEntry[]) => void,
): Unsubscribe {
  const services = getFirebaseClientServices();

  if (!services) {
    onChange([]);
    return () => undefined;
  }

  const ledgerQuery = query(
    collection(services.db, "users", uid, "tradeLedger"),
    orderBy("executedAt", "desc"),
    limit(10),
  );

  return onSnapshot(ledgerQuery, (snapshot) => {
    onChange(snapshot.docs.map((entryDoc) => ({ id: entryDoc.id, ...entryDoc.data() }) as TradeLedgerEntry));
  });
}

export async function connectExchangeAccount(credentials: ExchangeCredentialDraft) {
  const services = getRequiredServices();
  const connectExchange = httpsCallable(services.functions, "connectExchangeAccount");
  await connectExchange(credentials);
}

export async function createBotInstance(draft: BotConfigurationDraft) {
  const services = getRequiredServices();
  const createBot = httpsCallable(services.functions, "createBotInstance");
  await createBot(draft);
}

export async function requestFeeWalletTopUp(uid: string, amount: number) {
  const services = getRequiredServices();
  const requestRef = doc(collection(services.db, "users", uid, "fundingRequests"));

  await setDoc(requestRef, {
    amount,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function pauseBotInstance(uid: string, botId: string) {
  const services = getRequiredServices();
  await updateDoc(doc(services.db, "users", uid, "botInstances", botId), {
    status: "paused",
    updatedAt: serverTimestamp(),
  });
}

function getRequiredServices() {
  const services = getFirebaseClientServices();

  if (!services) {
    throw new Error("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* values to .env.local.");
  }

  return services;
}

function toFriendlyFirebaseError(error: unknown) {
  if (isFirebaseErrorWithCode(error, "permission-denied")) {
    return new Error(
      "Firestore permission denied. Deploy/update firestore.rules and ensure users can create their own profile document.",
    );
  }

  return error instanceof Error ? error : new Error("Something went wrong.");
}

function isFirebaseErrorWithCode(error: unknown, code: string) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeCode = (error as { code?: unknown }).code;
  return maybeCode === code || maybeCode === `auth/${code}` || maybeCode === `firestore/${code}`;
}