import type { Metadata } from "next";
import { LegalDocShell } from "@/components/wf/legal-doc-shell";
import { TermsOfServiceBody } from "@/components/wf/terms-of-service-body";

export const metadata: Metadata = {
  title: "Terms of Service — LumenWorship",
  description: "Terms governing your use of LumenWorship worship planning and presentation software.",
};

export default function TermsOfServicePage() {
  return (
    <LegalDocShell title="Terms of Service" lastUpdated="2 April 2026">
      <TermsOfServiceBody />
    </LegalDocShell>
  );
}
