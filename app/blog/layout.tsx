import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — worshipflow2",
  description: "Guides for worship leaders: free lyric formatting, slide makers, and browser-based presentation.",
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
