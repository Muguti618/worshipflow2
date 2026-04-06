import type { Metadata } from "next";
import { RegisterScreen } from "@/components/wf/register-screen";

export const metadata: Metadata = {
  title: "Create account — worshipflow2",
  description: "Create a worshipflow2 account stored on this browser.",
};

export default function RegisterRoutePage() {
  return <RegisterScreen />;
}
