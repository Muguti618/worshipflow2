"use client";

import { useParams } from "next/navigation";
import { SetlistEditor } from "@/components/wf/setlist-editor";

export default function EditSetlistPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  if (!id) {
    return <div className="p-8 text-sm text-wf-muted">Invalid setlist.</div>;
  }
  return <SetlistEditor setlistId={id} />;
}
