
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
} from "firebase/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { UserProfile } from "@/types/user-profile";
import { findOrCreateUser } from "@/actions/app-actions";

const USE_MOCK_AUTH = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mockUser: User = {
  uid: "mock-user-id",
  email: "mock.user@example.com",
  displayName: "Mock User",
  photoURL: "https://placehold.co/100x100.png",
  providerId: "mock",
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: "mock-refresh-token",
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => "mock-id-token",
  getIdTokenResult: async () => ({
    token: "mock-id-token",
    expirationTime: "",
    authTime: "",
    issuedAtTime: "",
    signInProvider: null,
    signInSecondFactor: null,
    claims: {},
  }),
  reload: async () => {},
  toJSON: () => ({}),
};

const mockUserProfile: UserProfile = {
  uid: "mock-user-id",
  email: "mock.user@example.com",
  displayName: "Mock User",
  photoURL: "https://placehold.co/100x100.png",
  role: "superadmin",
  createdAt: new Date(),
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (USE_MOCK_AUTH) {
      setUser(mockUser);
      setUserProfile(mockUserProfile);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await findOrCreateUser({
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (USE_MOCK_AUTH) {
      setUser(mockUser);
      setUserProfile(mockUserProfile);
      return
    };
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    if (USE_MOCK_AUTH) {
      setUser(null);
      setUserProfile(null);
      return;
    };
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

const UNPROTECTED_PATHS = ["/login"];

function ProtectedRouteContent({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isUnprotectedPath = UNPROTECTED_PATHS.includes(pathname);

  useEffect(() => {
    if (!loading && !user && !isUnprotectedPath) {
      const redirect = searchParams.get("redirect");
      router.push(redirect || `/login?redirect=${pathname}`);
    } else if (!loading && user && isUnprotectedPath) {
        const redirect = searchParams.get("redirect");
        router.push(redirect || "/");
    }
  }, [user, loading, router, pathname, isUnprotectedPath, searchParams]);

  if (loading || (!user && !isUnprotectedPath)) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="bg-card border-b sticky top-0 z-10">
          <div className="container mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-36" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto py-8 px-4">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-36 rounded-lg" />
            <Skeleton className="h-36 rounded-lg" />
            <Skeleton className="h-36 rounded-lg" />
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}


export function ProtectedRoute({ children }: { children: ReactNode }) {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <ProtectedRouteContent>{children}</ProtectedRouteContent>
      </Suspense>
    )
}
