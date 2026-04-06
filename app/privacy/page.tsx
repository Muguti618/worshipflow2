import type { Metadata } from "next";
import { LegalDocShell } from "@/components/wf/legal-doc-shell";
import { PrivacyPolicyBody } from "@/components/wf/privacy-policy-body";

export const metadata: Metadata = {
  title: "Privacy Policy — worshipflow2",
  description: "How worshipflow2 and Forma collect, use, and protect your personal data.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocShell title="Privacy Policy" lastUpdated="2 April 2026">
      <PrivacyPolicyBody />
    </LegalDocShell>
  );
}
