import type { Metadata } from "next";
import { LoginScreen } from "@/components/wf/login-screen";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Sign in — LumenWorship",
  description: "Sign in to LumenWorship.",
};

export default function LoginRoutePage() {
  return <LoginScreen showGuestContinue={!isSupabaseConfigured()} />;
}
