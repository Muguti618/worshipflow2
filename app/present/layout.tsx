import { PlanEntitlementsProvider } from "@/components/wf/plan-entitlements-context";

export default function PresentLayout({ children }: { children: React.ReactNode }) {
  return <PlanEntitlementsProvider>{children}</PlanEntitlementsProvider>;
}
