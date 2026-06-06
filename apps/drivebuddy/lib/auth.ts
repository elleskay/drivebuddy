import { secureGet, secureSet, secureDelete } from "./secure-storage";

// JWTs from the NestJS API live in the device keychain/keystore via
// expo-secure-store on native (web demo falls back to localStorage; see
// secure-storage.ts). Never AsyncStorage, never the JS bundle.
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await secureSet(ACCESS_TOKEN_KEY, accessToken);
  await secureSet(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getAccessToken(): Promise<string | null> {
  return secureGet(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return secureGet(REFRESH_TOKEN_KEY);
}

export async function clearTokens(): Promise<void> {
  await secureDelete(ACCESS_TOKEN_KEY);
  await secureDelete(REFRESH_TOKEN_KEY);
}
