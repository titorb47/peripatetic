"use client";

import React, { useState } from "react";
import {
  Terminal,
  Sparkles,
  Upload,
  ShieldAlert,
  Play,
  BookOpen,
  ArrowRight,
  Compass,
  Zap,
  Network,
  GitCommit,
  FileText,
  SlidersHorizontal,
  Star,
  Check,
} from "lucide-react";
import { KeptFileItem, PreSurveyData } from "@/types/schema";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCurriculum: (
    presetKey: string,
    customTopic?: string,
    preSurvey?: PreSurveyData,
    fileContext?: string
  ) => Promise<void>;
  onRunDemoSeed: () => void;
  onTriggerFileUpload: () => void;
  onTestMaliciousInjection: () => void;
  onOpenSecurityModal: () => void;
  isGeneratingCurriculum: boolean;
  keptFiles: KeptFileItem[];
}

const FEATURED_PATHS = [
  {
    key: "posix-shell",
    badge: "Flagship Demo",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    title: "How a Command Shell Works",
    description:
      "Learn how your computer reads commands, starts programs, and connects pipes.",
    icon: Terminal,
  },
  {
    key: "git-internals",
    badge: "Version Control",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    title: "How Git Saves Your Code",
    description:
      "Understand staging, commits, branches, and merges without memorizing magic commands.",
    icon: GitCommit,
  },
  {
    key: "tcp-http",
    badge: "Web & Networking",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    title: "How Web Servers Talk to Browsers",
    description:
      "Walk through how network connections open, read requests, and send back web pages.",
    icon: Network,
  },
];

const PREREQUISITE_OPTIONS = [
  "Basic files & folders",
  "Terminal / CLI basics",
  "Variables & loops",
  "Git add & commit",
  "How websites load",
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
  keptFiles,
}: OnboardingModalProps) {
  const [customTopic, setCustomTopic] = useState("");
  const [selectedFileContext, setSelectedFileContext] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // Pre-Learning Survey State
  const [experienceLevel, setExperienceLevel] = useState<
    "beginner" | "intermediate" | "advanced"
  >("beginner");
  const [preferredDepth, setPreferredDepth] = useState<
    "dynamic" | "short" | "deep"
  >("dynamic");
  const [confidenceBefore, setConfidenceBefore] = useState<number>(2);
  const [knownPrerequisites, setKnownPrerequisites] = useState<string[]>([]);

  if (!isOpen) return null;

  const currentPreSurvey: PreSurveyData = {
    experienceLevel,
    knownPrerequisites,
    preferredDepth,
    confidenceBefore,
  };

  const togglePrereq = (item: string) => {
    setKnownPrerequisites((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopic.trim()) return;
    await onSelectCurriculum(
      "",
      customTopic.trim(),
      currentPreSurvey,
      selectedFileContext
    );
  };

  const handlePromptFromFile = async (promptText: string, file: KeptFileItem) => {
    setCustomTopic(promptText);
    setSelectedFileContext(file.snippet);
    setSelectedFileName(file.filename);
    await onSelectCurriculum("", promptText, currentPreSurvey, file.snippet);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/95 text-slate-100 shadow-2xl overflow-hidden my-auto">
        {/* Clean, Welcoming Header */}
        <div className="border-b border-slate-800 bg-gradient-to-r from-slate-950 via-cyan-950/30 to-slate-950 px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-400">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-100">
                  What would you like to learn today?
                </h2>
                <p className="text-xs text-slate-400">
                  Set your starting level, pick a prompt from your kept files, or type any topic.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Back to Current Map &rarr;
            </button>
          </div>
        </div>

        {/* Main Modal Body */}
        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* 1. Quick Pre-Learning Survey (Tailors task difficulty & skips steps you already know) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Step 1: Quick Pre-Check (Tailors Tasks to Your Level)</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {experienceLevel === "beginner"
                  ? "Starts at Step 1 with everyday analogies"
                  : experienceLevel === "intermediate"
                  ? "Pre-completes Step 1 so you skip the intro"
                  : "Pre-completes Steps 1–2 for a faster challenge"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Experience Level */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-300">
                  How familiar are you with this?
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "beginner", label: "Brand New" },
                    { id: "intermediate", label: "Some Basics" },
                    { id: "advanced", label: "Experienced" },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() =>
                        setExperienceLevel(
                          lvl.id as "beginner" | "intermediate" | "advanced"
                        )
                      }
                      className={`rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition-all ${
                        experienceLevel === lvl.id
                          ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-200"
                          : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Path Length */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-300">
                  Number of steps (Dynamic)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "dynamic", label: "Auto-Fit" },
                    { id: "short", label: "Short (3)" },
                    { id: "deep", label: "Deep (6-7)" },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() =>
                        setPreferredDepth(d.id as "dynamic" | "short" | "deep")
                      }
                      className={`rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition-all ${
                        preferredDepth === d.id
                          ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-200"
                          : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Starting Confidence */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-300">
                  Confidence right now ({confidenceBefore}/5)
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setConfidenceBefore(score)}
                      className={`flex-1 rounded-xl border py-1.5 text-[11px] font-bold transition-all flex items-center justify-center gap-0.5 ${
                        confidenceBefore >= score
                          ? "border-amber-500/60 bg-amber-500/20 text-amber-300"
                          : "border-slate-800 bg-slate-900 text-slate-500"
                      }`}
                    >
                      <Star className="w-2.5 h-2.5 fill-current" />
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Prerequisites already known */}
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400">
                Things you already know:
              </span>
              {PREREQUISITE_OPTIONS.map((item) => {
                const active = knownPrerequisites.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => togglePrereq(item)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                      active
                        ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-200 font-medium"
                        : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {active && <Check className="w-3 h-3 text-emerald-400" />}
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Custom Topic Input */}
          <form
            onSubmit={handleCustomSubmit}
            className="rounded-2xl border border-cyan-500/30 bg-slate-950/90 p-4 space-y-3"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                <Sparkles className="w-3.5 h-3.5" />
                Step 2: Type Anything You Want to Learn
              </label>
              {selectedFileName && (
                <span className="text-[11px] text-emerald-300 font-mono">
                  Using context from: {selectedFileName}
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder='e.g., "How do I git commit?", "How Neural Networks Learn", "Photosynthesis", "Public Key Encryption"...'
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isGeneratingCurriculum || !customTopic.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-colors shrink-0 shadow-lg shadow-cyan-950/50"
              >
                <Zap className="w-4 h-4 fill-current" />
                {isGeneratingCurriculum ? "Building Path..." : "Start Learning"}
              </button>
            </div>
          </form>

          {/* 3. Prompts Based on the Files We Keep */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-200">
                  Suggested Prompts from Your Kept Files &amp; Notes
                </h3>
              </div>
              <button
                type="button"
                onClick={onTriggerFileUpload}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors"
              >
                <Upload className="w-3 h-3" />
                Add / Upload a Note (.md or .txt)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {keptFiles.map((file) => (
                <div
                  key={file.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 flex flex-col justify-between space-y-2.5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 truncate">
                      <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{file.filename}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {file.snippet}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                    <div className="text-[10px] font-semibold text-slate-400">
                      Click a prompt from this file:
                    </div>
                    <div className="flex flex-col gap-1">
                      {file.suggestedPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => handlePromptFromFile(prompt, file)}
                          className="text-left rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 text-[11px] font-medium text-cyan-300 hover:border-cyan-500/50 hover:bg-slate-800 transition-colors flex items-center justify-between gap-1"
                        >
                          <span className="truncate">{prompt}</span>
                          <ArrowRight className="w-3 h-3 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Featured Ready-to-Go Paths */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-300">
              Featured Learning Paths
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {FEATURED_PATHS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    onClick={() =>
                      onSelectCurriculum(item.key, undefined, currentPreSurvey)
                    }
                    className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/70 p-4 hover:border-cyan-500/60 hover:bg-slate-900 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-cyan-400">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-cyan-400">
                      <span>Start Path</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Compact Bottom Bar: Live Demo, Security Misuse Test & Info */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onRunDemoSeed();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Live Demo
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTestMaliciousInjection();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/25 transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Test Prompt-Injection Guard
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSecurityModal();
              }}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 underline"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Safety &amp; Rubric Info
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
