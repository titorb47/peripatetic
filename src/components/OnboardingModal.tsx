"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Upload,
  ShieldAlert,
  Play,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Compass,
  Zap,
  FileText,
  Star,
  Check,
  Plus,
  Hammer,
} from "lucide-react";
import { KeptFileItem, PreSurveyData, SuggestedProject } from "@/types/schema";

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
  masteredNodeTitles: string[];
}

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
  masteredNodeTitles,
}: OnboardingModalProps) {
  const [step, setStep] = useState<"topic" | "survey">("topic");
  const [customTopic, setCustomTopic] = useState("");
  const [selectedFileContext, setSelectedFileContext] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // Dynamic Projects, Prerequisites & AI Planning Note fetched for the chosen topic
  const [suggestedProjects, setSuggestedProjects] = useState<SuggestedProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<SuggestedProject | null>(null);
  const [customProjectInput, setCustomProjectInput] = useState("");
  const [dynamicPrereqs, setDynamicPrereqs] = useState<string[]>([]);
  const [aiPlanNote, setAiPlanNote] = useState<string | null>(null);
  const [isLoadingPrereqs, setIsLoadingPrereqs] = useState(false);
  const [customPrereqInput, setCustomPrereqInput] = useState("");

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

  // Move from Step 1 (Topic) -> Step 2 (Dynamic Pre-Survey for that Topic)
  const proceedToPreSurvey = async (
    topicToLearn: string,
    fileCtx = "",
    fileName: string | null = null
  ) => {
    const clean = topicToLearn.trim();
    if (!clean) return;

    setCustomTopic(clean);
    setSelectedFileContext(fileCtx);
    setSelectedFileName(fileName);
    setKnownPrerequisites([...masteredNodeTitles]);
    setSuggestedProjects([]);
    setSelectedProject(null);
    setAiPlanNote(null);
    setStep("survey");
    setIsLoadingPrereqs(true);

    try {
      const res = await fetch("/api/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prereqs",
          topic: clean,
          fileContext: fileCtx,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.suggestedProjects) && data.suggestedProjects.length > 0) {
        setSuggestedProjects(data.suggestedProjects);
        setSelectedProject(data.suggestedProjects[1] ?? data.suggestedProjects[0]);
      }
      const fetched: string[] = Array.isArray(data.prerequisites)
        ? data.prerequisites
        : [];
      const combined = Array.from(
        new Set([...masteredNodeTitles, ...fetched])
      );
      setDynamicPrereqs(combined);
      if (typeof data.planNote === "string" && data.planNote.trim()) {
        setAiPlanNote(data.planNote.trim());
      }
    } catch {
      setDynamicPrereqs([...masteredNodeTitles]);
    } finally {
      setIsLoadingPrereqs(false);
    }
  };

  const togglePrereq = (item: string) => {
    setKnownPrerequisites((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const handleAddCustomPrereq = () => {
    const val = customPrereqInput.trim();
    if (!val) return;
    if (!dynamicPrereqs.includes(val)) {
      setDynamicPrereqs((prev) => [...prev, val]);
    }
    if (!knownPrerequisites.includes(val)) {
      setKnownPrerequisites((prev) => [...prev, val]);
    }
    setCustomPrereqInput("");
  };

  const handleAddCustomProject = () => {
    const val = customProjectInput.trim();
    if (!val) return;
    const customProj: SuggestedProject = {
      title: val,
      deliverable: `Complete and verify your custom project: "${val}"`,
      difficulty: "Custom",
    };
    setSuggestedProjects((prev) => [customProj, ...prev]);
    setSelectedProject(customProj);
    setCustomProjectInput("");
  };

  const handleFinalStart = async () => {
    const preSurvey: PreSurveyData = {
      experienceLevel,
      knownPrerequisites,
      preferredDepth,
      confidenceBefore,
      selectedProject: selectedProject ?? undefined,
    };
    await onSelectCurriculum("", customTopic, preSurvey, selectedFileContext);
    setStep("topic");
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/95 text-slate-100 shadow-2xl overflow-hidden my-auto">
        {/* Minimal Header */}
        <div className="border-b border-slate-800 bg-slate-950/80 px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-400">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {step === "topic"
                  ? "What would you like to learn?"
                  : `Quick Check: ${customTopic}`}
              </h2>
              <p className="text-xs text-slate-400">
                {step === "topic"
                  ? "Type any topic or pick a prompt from the files you keep."
                  : "Tell us what you already know so we can size and tailor your steps."}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>

        {/* STEP 1: CLEAN TOPIC & KEPT FILES PICKER */}
        {step === "topic" && (
          <div className="p-6 space-y-6">
            {/* 1. Single Clean Topic Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                proceedToPreSurvey(customTopic);
              }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder='Type any topic (e.g., "How do I git commit?", "Photosynthesis", "Baking sourdough")...'
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={!customTopic.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-40 transition-colors shrink-0"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* 2. Prompts Generated from Real Kept Files (`kept-notes/` + Uploaded Notes) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  Prompts from Your Kept Files
                </span>
                <button
                  type="button"
                  onClick={onTriggerFileUpload}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:border-cyan-500/50 transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  Upload Note (.md / .txt)
                </button>
              </div>

              {keptFiles.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400 text-center">
                  No kept files yet. Upload a <code>.md</code> or{" "}
                  <code>.txt</code> note to generate learning prompts from it.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {keptFiles.map((file) => (
                    <div
                      key={file.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 truncate">
                        <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{file.filename}</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {file.suggestedPrompts.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() =>
                              proceedToPreSurvey(
                                prompt,
                                file.snippet,
                                file.filename
                              )
                            }
                            className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-cyan-300 hover:border-cyan-500/50 hover:bg-slate-800 transition-colors text-left flex items-center gap-1.5"
                          >
                            <span>{prompt}</span>
                            <ArrowRight className="w-3 h-3 shrink-0 opacity-70" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Subtle Bottom Bar for Hackathon Demo & Safety */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    onRunDemoSeed();
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Load Live Demo
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onTestMaliciousInjection();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Test Safety Guard
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
        )}

        {/* STEP 2: PROJECT PICKER + DYNAMIC PRE-SURVEY TAILORED TO CHOSEN TOPIC */}
        {step === "survey" && (
          <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
            {selectedFileName && (
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-3 py-2 text-xs text-cyan-200 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>
                  Using context from your file: <strong>{selectedFileName}</strong>
                </span>
              </div>
            )}

            {/* Question 1: AI-Suggested Projects to Build / Get Done */}
            <div className="space-y-2.5 rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <Hammer className="w-3.5 h-3.5 text-cyan-400" />
                  1. Pick a Project to Build &amp; Complete for{" "}
                  <span className="text-cyan-300">{customTopic}</span>
                </label>
                {isLoadingPrereqs && (
                  <span className="text-[11px] text-cyan-400 animate-pulse flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI designing projects...
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400">
                Your learning map and branches will be structured as hands-on milestones to finish this project:
              </p>

              <div className="space-y-2">
                {suggestedProjects.map((proj) => {
                  const isSelected = selectedProject?.title === proj.title;
                  return (
                    <button
                      key={proj.title}
                      type="button"
                      onClick={() => setSelectedProject(proj)}
                      className={`w-full text-left rounded-xl border p-3 transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? "border-cyan-500 bg-cyan-500/15 text-slate-100 shadow-sm"
                          : "border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-bold flex items-center gap-2">
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          )}
                          <span>{proj.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Deliverable: {proj.deliverable}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                        {proj.difficulty}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom project input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={customProjectInput}
                  onChange={(e) => setCustomProjectInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomProject();
                    }
                  }}
                  placeholder="Or type your own project idea to build..."
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomProject}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Use Project
                </button>
              </div>
            </div>

            {/* Question 2: Familiarity & Starting Confidence */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-200">
                  2. Your familiarity with this topic
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "beginner", label: "Brand New" },
                    { id: "intermediate", label: "Know Basics" },
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
                      className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                        experienceLevel === lvl.id
                          ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-200"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-200">
                  2. Starting confidence ({confidenceBefore}/5)
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setConfidenceBefore(score)}
                      className={`flex-1 rounded-xl border py-2 text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        confidenceBefore >= score
                          ? "border-amber-500/60 bg-amber-500/20 text-amber-300"
                          : "border-slate-800 bg-slate-950 text-slate-500"
                      }`}
                    >
                      <Star className="w-3 h-3 fill-current" />
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Question 3: Dynamic Prerequisites Generated for This Topic */}
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">
                  3. Check anything you already know about{" "}
                  <span className="text-cyan-300">{customTopic}</span>
                </label>
                {isLoadingPrereqs && (
                  <span className="text-[11px] text-cyan-400 animate-pulse flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI analyzing topic prerequisites...
                  </span>
                )}
              </div>

              {aiPlanNote && (
                <p className="text-[11px] text-cyan-300/90 bg-cyan-950/30 border border-cyan-500/20 rounded-xl px-3 py-1.5">
                  <Sparkles className="w-3 h-3 inline mr-1 text-cyan-400" />
                  {aiPlanNote}
                </p>
              )}

              <div className="flex flex-wrap gap-1.5 pt-1">
                {dynamicPrereqs.map((item) => {
                  const active = knownPrerequisites.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => togglePrereq(item)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition-colors ${
                        active
                          ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-200 font-medium"
                          : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      {item}
                    </button>
                  );
                })}
              </div>

              {/* Add your own known concept */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={customPrereqInput}
                  onChange={(e) => setCustomPrereqInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomPrereq();
                    }
                  }}
                  placeholder="Or type something else you already know..."
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomPrereq}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>

            {/* Question 4: Path Depth */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-300">
                4. Path length:
              </span>
              <div className="flex items-center gap-1.5">
                {[
                  { id: "dynamic", label: "Auto-Fit (Recommended)" },
                  { id: "short", label: "Quick (3 steps)" },
                  { id: "deep", label: "Deep Dive (6–7 steps)" },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() =>
                      setPreferredDepth(d.id as "dynamic" | "short" | "deep")
                    }
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                      preferredDepth === d.id
                        ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-200"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Back / Build Map Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep("topic")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <button
                type="button"
                onClick={handleFinalStart}
                disabled={isGeneratingCurriculum}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-colors shadow-lg shadow-cyan-950/50"
              >
                <Zap className="w-4 h-4 fill-current" />
                {isGeneratingCurriculum
                  ? "Building Your Map..."
                  : "Build My Learning Map"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
