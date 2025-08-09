"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | null;
}

interface Session {
  id: string;
  expiresAt: Date;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const getSession = async () => {
      try {
        const session = await authClient.getSession();
        if (session.data?.user && session.data?.session) {
          setAuthState({
            user: session.data.user,
            session: session.data.session,
            isLoading: false,
            error: null,
          });
        } else {
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error("Session error:", error);
        setAuthState({
          user: null,
          session: null,
          isLoading: false,
          error: "Failed to get session",
        });
      }
    };

    getSession();
  }, []);

  const signOut = async () => {
    try {
      await authClient.signOut();
      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("Sign out error:", error);
      setAuthState(prev => ({
        ...prev,
        error: "Failed to sign out",
      }));
    }
  };

  return {
    ...authState,
    signOut,
    isAuthenticated: !!authState.user && !!authState.session,
  };
}
