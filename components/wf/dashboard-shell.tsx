"use client";

import { DashboardAuthGate } from "@/components/wf/dashboard-auth-gate";
import { Sidebar } from "@/components/wf/sidebar";
import { TopBar } from "@/components/wf/top-bar";
import { AuthAntiAbuseProvider } from "@/components/wf/auth-anti-abuse-context";
import { PlanEntitlementsProvider } from "@/components/wf/plan-entitlements-context";
import { MarketingReelTour } from "@/components/wf/marketing-reel-tour";
import { RegisterDeviceSession } from "@/components/wf/register-device-session";
import { WorshipLibraryProvider } from "@/components/wf/worship-library-provider";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthGate>
      <WorshipLibraryProvider>
        <PlanEntitlementsProvider>
          <AuthAntiAbuseProvider>
            <RegisterDeviceSession />
            <div className="flex min-h-screen">
              <Sidebar />
              <div
                data-wf-reel-tour-main
                className="flex min-h-0 min-w-0 flex-1 flex-col transition-[transform] duration-300 ease-out"
              >
                <TopBar />
                <div className="flex-1 overflow-auto">{children}</div>
              </div>
              <MarketingReelTour />
            </div>
          </AuthAntiAbuseProvider>
        </PlanEntitlementsProvider>
      </WorshipLibraryProvider>
    </DashboardAuthGate>
  );
}
