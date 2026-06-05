import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import { clearTokens, getAccessToken } from "./auth";

interface AuthState {
  ready: boolean; // initial token load finished
  signedIn: boolean;
  user: { id: string; email: string; fullName: string } | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthState["user"]>(null);

  // On launch, treat a stored token as signed-in (refresh kicks in lazily on 401).
  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (token) {
        try {
          const p = await api.getProfile();
          setUser({ id: p.id, email: p.email, fullName: p.fullName });
        } catch {
          await clearTokens();
        }
      }
      setReady(true);
    })();
  }, []);

  const value: AuthState = {
    ready,
    signedIn: user !== null,
    user,
    async signIn(email, password) {
      const r = await api.login(email, password);
      setUser(r.user);
    },
    async signUp(email, password, fullName) {
      const r = await api.register(email, password, fullName);
      setUser(r.user);
    },
    async signOut() {
      await clearTokens();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
