import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShellFromScratch // Feynman DAG Learning Platform",
  description:
    "Learn POSIX systems programming ('Build a POSIX Tiny Shell in Python') via a Directed Acyclic Graph curriculum, strict Feynman-technique AI tutoring, dynamic remediation branching, and Obsidian Markdown vault exports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}

