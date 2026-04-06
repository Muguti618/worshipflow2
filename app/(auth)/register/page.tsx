import type { Metadata } from "next";
import { RegisterScreen } from "@/components/wf/register-screen";

export const metadata: Metadata = {
  title: "Create account — LumenWorship",
  description: "Create a LumenWorship account stored on this browser.",
};

export default function RegisterRoutePage() {
  return <RegisterScreen />;
}
