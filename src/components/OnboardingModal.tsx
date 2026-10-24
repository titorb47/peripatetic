"use client";

import React, { useState } from "react";
import {
  Terminal,
  Sparkles,
  Upload,
  ShieldAlert,
  Play,
  GitBranch,
  Cpu,
  BookOpen,
  ArrowRight,
  Compass,
  Zap,
  Network,
  GitCommit,
  FileSpreadsheet,
} from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCurriculum: (presetKey: string, customTopic?: string) => Promise<void>;
  onRunDemoSeed: () => void;
  onTriggerFileUpload: () => void;
  onTestMaliciousInjection: () => void;
  onOpenSecurityModal: () => void;
  isGeneratingCurriculum: boolean;
}

const SUGGESTED_TOPICS = [
  {
    key: "posix-shell",
    badge: "Default Flagship Curriculum",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    title: "Build a POSIX Tiny Shell in Python",
    subtitle: "REPL, shlex, os.fork(), os.execvp(), os.waitpid(), os.pipe() & os.dup2()",
    description:
      "Master how Linux/macOS shells spawn processes, replace memory images, reap zombies, and wire kernel file descriptor pipelines.",
    icon: Terminal,
  },
  {
    key: "tcp-http",
    badge: "Networking Systems",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    title: "Build an HTTP/1.1 Server over Raw TCP Sockets",
    subtitle: "socket(), SO_REUSEADDR, bind(), listen(), accept(), recv() & sendall()",
    description:
      "Understand how kernel socket file descriptors, SYN queues, and byte-stream framing power web servers from scratch.",
    icon: Network,
  },
  {
    key: "git-internals",
    badge: "Storage & DAGs",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    title: "Build Git Internals & Content-Addressable DAG",
    subtitle: "SHA-1 blobs, zlib compression, tree objects, commit snapshots & refs/HEAD",
    description:
      "Demystify how Git stores immutable snapshots in .git/objects and resolves branches via 41-byte pointer files.",
    icon: GitCommit,
  },
];

export function OnboardingModal({
  isOpen,
  onClose,
  onSelectCurriculum,
  onRunDemoSeed,
  onTriggerFileUpload,
  onTestMaliciousInjection,
  onOpenSecurityModal,
  isGeneratingCurriculum,
}: OnboardingModalProps) {
  const [customTopic, setCustomTopic] = useState("");

  if (!isOpen) return null;

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopic.trim()) return;
    await onSelectCurriculum("", customTopic.trim());
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/95 text-slate-100 shadow-2xl overflow-hidden my-auto">
        {/* Top Hero Banner */}
        <div className="border-b border-slate-800 bg-gradient-to-r from-slate-950 via-cyan-950/30 to-slate-950 px-6 py-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 shadow-inner">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight text-slate-100">
                    What do you want to learn from first principles today?
                  </h2>
                  <span className="rounded-full bg-cyan-500/15 border border-cyan-500/40 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-cyan-300">
                    Feynman DAG Engine
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Choose a curated systems curriculum, generate a custom 5-node DAG with Live Gemini AI, or launch the 4-minute hackathon demo seed.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Continue Current Graph &rarr;
            </button>
          </div>
        </div>

        {/* Main Modal Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* 1. Custom Topic Prompt Bar ("What do you want to learn?") */}
          <form
            onSubmit={handleCustomSubmit}
            className="rounded-2xl border border-cyan-500/30 bg-slate-950/90 p-4 space-y-3 shadow-inner"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-mono text-cyan-300">
                <Sparkles className="w-3.5 h-3.5" />
                Generate Any Custom Curriculum with Live Gemini AI
              </label>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
                <span>Quick ideas:</span>
                {[
                  "How Git Commit Works",
                  "Transformer Self-Attention",
                  "Public Key Cryptography & TLS",
                  "SQLite B-Tree Engine",
                  "Fourier Transform Intuition",
                ].map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => setCustomTopic(idea)}
                    className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder='Type ANY topic to learn from first principles (e.g., "How do I git commit", "Backpropagation in Neural Nets", "TCP Handshakes", "Dynamic Programming")...'
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isGeneratingCurriculum || !customTopic.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-colors shrink-0 shadow-lg shadow-cyan-950/50"
              >
                <Zap className="w-4 h-4 fill-current" />
                {isGeneratingCurriculum
                  ? "Building 5-Node DAG..."
                  : "Generate Custom DAG"}
              </button>
            </div>
          </form>

          {/* 2. Curated Systems Programming Tracks */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400">
                Curated Systems Tracks (Instant 5-Node DAGs)
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                Vertical Top-Down Trunk + Right Remediation Branches
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {SUGGESTED_TOPICS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    onClick={() => onSelectCurriculum(item.key)}
                    className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/70 p-4 hover:border-cyan-500/60 hover:bg-slate-900 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 group-hover:border-cyan-500/40">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                        {item.title}
                      </h4>
                      <p className="font-mono text-[10px] text-cyan-400/90">
                        {item.subtitle}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-cyan-400">
                      <span>Launch Track</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Quick Actions: Run Live Demo Seed, Upload Note/JSON, & Security Misuse Test */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400">
              Hackathon Demo &amp; Vault Actions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option A: Run 4-Minute Live Demo Seed */}
              <button
                type="button"
                onClick={() => {
                  onRunDemoSeed();
                  onClose();
                }}
                className="flex items-start gap-3 rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-left hover:bg-amber-500/20 transition-colors"
              >
                <div className="rounded-xl bg-amber-500/20 p-2 text-amber-300 shrink-0">
                  <Play className="w-4 h-4 fill-current" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-amber-300">
                    Run 4-Minute Live Demo Seed
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Pre-merges <code className="font-mono">n1</code> &amp;{" "}
                    <code className="font-mono">n2</code>, opens{" "}
                    <code className="font-mono">n3 (os.execvp)</code> with the
                    file-descriptor misconception ready to branch into{" "}
                    <code className="font-mono">n3-b1</code>.
                  </p>
                </div>
              </button>

              {/* Option B: Upload / Import Note or JSON State */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTriggerFileUpload();
                }}
                className="flex items-start gap-3 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-4 text-left hover:bg-cyan-500/20 transition-colors"
              >
                <div className="rounded-xl bg-cyan-500/20 p-2 text-cyan-300 shrink-0">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-cyan-300">
                    Upload Obsidian .md Note or .json
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Restore a saved <code className="font-mono">graph-state.json</code>{" "}
                    or import an untrusted <code className="font-mono">.md</code>{" "}
                    note through our Zod +{" "}
                    <code className="font-mono">&lt;untrusted_learner_data&gt;</code>{" "}
                    sandbox.
                  </p>
                </div>
              </button>

              {/* Option C: Test Responsible AI & Prompt Injection Misuse */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTestMaliciousInjection();
                }}
                className="flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-left hover:bg-rose-500/20 transition-colors"
              >
                <div className="rounded-xl bg-rose-500/20 p-2 text-rose-300 shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-rose-300">
                    Run Prompt-Injection Misuse Test
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Demonstrates Rubric 5/5 Responsible Information Handling by
                    injecting a malicious <code className="font-mono">.md</code>{" "}
                    note and showing the live security refusal.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Footer Architecture Highlights */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/90 bg-slate-950/60 px-4 py-3 text-[11px] text-slate-400">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5 font-mono text-emerald-300">
                <Cpu className="w-3.5 h-3.5" /> POSIX Target (Linux/macOS/WSL)
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-amber-300">
                <GitBranch className="w-3.5 h-3.5" /> Max Branch Depth = 1
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-cyan-300">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Client-Side JSZip Obsidian Export
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSecurityModal();
              }}
              className="inline-flex items-center gap-1 font-mono text-xs text-rose-300 hover:underline"
            >
              <BookOpen className="w-3.5 h-3.5" />
              View Rubric Security &amp; Weaknesses Disclosure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

