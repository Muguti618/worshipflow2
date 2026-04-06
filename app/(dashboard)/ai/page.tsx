import type { Metadata } from "next";
import { AiAssistantPage } from "@/components/wf/ai-assistant-page";

export const metadata: Metadata = {
  title: "Assistant — worshipflow2",
  description: "Get help with slides, setlists, scripture ideas, and presenting.",
};

export default function Page() {
  return <AiAssistantPage />;
}
