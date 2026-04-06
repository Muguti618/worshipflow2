import type { Metadata } from "next";
import { LoginScreen } from "@/components/wf/login-screen";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Sign in — worshipflow2",
  description: "Sign in to worshipflow2.",
};

export default function LoginRoutePage() {
  return <LoginScreen showGuestContinue={!isSupabaseConfigured()} />;
}
