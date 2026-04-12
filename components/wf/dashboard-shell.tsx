"use client";

import { useEffect, useState } from "react";
import { DashboardAuthGate } from "@/components/wf/dashboard-auth-gate";
import { Sidebar } from "@/components/wf/sidebar";
import { TopBar } from "@/components/wf/top-bar";
import { AuthAntiAbuseProvider } from "@/components/wf/auth-anti-abuse-context";
import { PlanEntitlementsProvider } from "@/components/wf/plan-entitlements-context";
import { RegisterDeviceSession } from "@/components/wf/register-device-session";
import { WorshipLibraryProvider } from "@/components/wf/worship-library-provider";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) setMobileNavOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <DashboardAuthGate>
      <WorshipLibraryProvider>
        <PlanEntitlementsProvider>
          <AuthAntiAbuseProvider>
            <RegisterDeviceSession />
            <div className="flex min-h-screen min-h-[100dvh]">
              <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
              <div className="flex min-w-0 flex-1 flex-col">
                <TopBar onMenuClick={() => setMobileNavOpen(true)} />
                <div className="flex-1 overflow-x-hidden overflow-y-auto">{children}</div>
              </div>
            </div>
          </AuthAntiAbuseProvider>
        </PlanEntitlementsProvider>
      </WorshipLibraryProvider>
    </DashboardAuthGate>
  );
}
