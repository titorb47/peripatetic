"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  KeyRound,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Upload,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Star,
  Plus,
  Check,
  Hammer,
  HelpCircle,
  X,
} from "lucide-react";
import { KeptFileItem, PreSurveyData, SuggestedProject } from "@/types/schema";

interface SessionOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCurriculum: (
    presetKey: string,
    customTopic?: string,
    preSurvey?: PreSurveyData,
    fileContext?: string,
    userApiKey?: string
  ) => Promise<void>;
  keptFiles: KeptFileItem[];
  onUploadNoteFile: (file: File) => Promise<void>;
  masteredNodeTitles: string[];
  isGeneratingCurriculum: boolean;
  activeApiKey: string;
  onSaveApiKey: (key: string) => void;
}

export function SessionOnboardingModal({
  isOpen,
  onClose,
  onSelectCurriculum,
  keptFiles,
  onUploadNoteFile,
  masteredNodeTitles,
  isGeneratingCurriculum,
  activeApiKey,
  onSaveApiKey,
}: SessionOnboardingModalProps) {
  // Step 1: "key" -> Step 2: "memory" -> Step 3: "topic" -> Step 4: "survey"
  const [currentStep, setCurrentStep] = useState<
    "key" | "memory" | "topic" | "survey"
  >("key");

  // Step 1: API Key State
  const [enteredKey, setEnteredKey] = useState(activeApiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyValidationStatus, setKeyValidationStatus] = useState<{
    valid: boolean;
    message?: string;
  } | null>(null);

  // Step 2: Memory File State
  const [selectedFile, setSelectedFile] = useState<KeptFileItem | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Step 3: Topic Prompting State
  const [customTopic, setCustomTopic] = useState("");

  // Step 4: Project Picker & Dynamic Pre-Survey
  const [suggestedProjects, setSuggestedProjects] = useState<SuggestedProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<SuggestedProject | null>(null);
  const [customProjectInput, setCustomProjectInput] = useState("");
  const [dynamicPrereqs, setDynamicPrereqs] = useState<string[]>([]);
  const [aiPlanNote, setAiPlanNote] = useState<string | null>(null);
  const [isLoadingPrereqs, setIsLoadingPrereqs] = useState(false);
  const [customPrereqInput, setCustomPrereqInput] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<
    "beginner" | "intermediate" | "advanced"
  >("beginner");
  const [preferredDepth, setPreferredDepth] = useState<
    "dynamic" | "short" | "deep"
  >("dynamic");
  const [confidenceBefore, setConfidenceBefore] = useState<number>(2);
  const [knownPrerequisites, setKnownPrerequisites] = useState<string[]>([]);

  // Sync enteredKey if activeApiKey changes
  useEffect(() => {
    if (activeApiKey) {
      setEnteredKey(activeApiKey);
    }
  }, [activeApiKey]);

  // Initial step determination: if API key already saved, start at "memory" or "topic"
  useEffect(() => {
    if (isOpen) {
      const savedKey =
        activeApiKey ||
        (typeof window !== "undefined"
          ? localStorage.getItem("gemini_api_key_v1") || ""
          : "");
      if (savedKey.trim()) {
        setEnteredKey(savedKey.trim());
        // User already has a key, start at memory choice
        setCurrentStep("memory");
      } else {
        setCurrentStep("key");
      }
    }
  }, [isOpen, activeApiKey]);

  if (!isOpen) return null;

  // --- Step 1: Verify & Save API Key ---
  const handleVerifyAndProceedKey = async () => {
    const key = enteredKey.trim();
    if (!key) {
      setKeyValidationStatus({
        valid: false,
        message: "Please enter a valid Gemini API key (starts with AIza...).",
      });
      return;
    }

    setIsValidatingKey(true);
    setKeyValidationStatus(null);

    try {
      const res = await fetch("/api/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_api_key",
          userApiKey: key,
        }),
      });
      const data = await res.json();
      if (data.valid) {
        onSaveApiKey(key);
        setKeyValidationStatus({
          valid: true,
          message: "API Key verified successfully with Google Gemini!",
        });
        setTimeout(() => {
          setCurrentStep("memory");
        }, 400);
      } else {
        setKeyValidationStatus({
          valid: false,
          message:
            data.error ||
            "Unable to verify this key with Gemini. Please double-check your key.",
        });
      }
    } catch {
      // In case of network error, allow proceeding if key matches pattern
      if (key.startsWith("AIza") || key.length > 20) {
        onSaveApiKey(key);
        setCurrentStep("memory");
      } else {
        setKeyValidationStatus({
          valid: false,
          message: "Network error verifying key. Please check your connection.",
        });
      }
    } finally {
      setIsValidatingKey(false);
    }
  };

  // --- Step 2: Handle File Upload ---
  const handleFileUploadChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFile(true);
    setUploadError(null);
    try {
      await onUploadNoteFile(file);
      // Wait a moment for keptFiles to refresh
      setTimeout(() => {
        setIsUploadingFile(false);
      }, 500);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload note file"
      );
      setIsUploadingFile(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- Step 3 -> 4: Proceed to Pre-Survey & Project Selection ---
  const proceedToPreSurvey = async (
    topicToLearn: string,
    fileItem: KeptFileItem | null
  ) => {
    const clean = topicToLearn.trim();
    if (!clean) return;

    setCustomTopic(clean);
    setSelectedFile(fileItem);
    setKnownPrerequisites([...masteredNodeTitles]);
    setSuggestedProjects([]);
    setSelectedProject(null);
    setAiPlanNote(null);
    setCurrentStep("survey");
    setIsLoadingPrereqs(true);

    try {
      const res = await fetch("/api/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prereqs",
          topic: clean,
          fileContext: fileItem?.snippet || "",
          userApiKey: enteredKey.trim(),
        }),
      });
      const data = await res.json();
      if (
        Array.isArray(data.suggestedProjects) &&
        data.suggestedProjects.length > 0
      ) {
        setSuggestedProjects(data.suggestedProjects);
        setSelectedProject(
          data.suggestedProjects[1] ?? data.suggestedProjects[0]
        );
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

  // Final Action: Launch the Generated Curriculum Graph
  const handleFinalStart = async () => {
    const preSurvey: PreSurveyData = {
      experienceLevel,
      knownPrerequisites,
      preferredDepth,
      confidenceBefore,
      selectedProject: selectedProject ?? undefined,
    };
    await onSelectCurriculum(
      "",
      customTopic,
      preSurvey,
      selectedFile?.snippet || "",
      enteredKey.trim()
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      {/* Hidden file input for file upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt"
        onChange={handleFileUploadChange}
        className="hidden"
      />

      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/95 text-slate-100 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Step Progress Header */}
        <div className="border-b border-slate-800 bg-slate-950/80 px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 font-bold text-xs">
              {currentStep === "key"
                ? "1/3"
                : currentStep === "memory"
                ? "2/3"
                : "3/3"}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {currentStep === "key" && "Step 1: Connect Your Gemini API Key"}
                {currentStep === "memory" &&
                  "Step 2: Upload Memory Notes or Start from Scratch"}
                {currentStep === "topic" &&
                  "Step 3: What Topic Would You Like to Learn?"}
                {currentStep === "survey" &&
                  `Plan Your Project & Milestones: ${customTopic}`}
              </h2>
              <p className="text-xs text-slate-400">
                {currentStep === "key" &&
                  "Your key stays strictly private in your browser session."}
                {currentStep === "memory" &&
                  "Seed your learning DAG from an Obsidian note or begin with a clean slate."}
                {currentStep === "topic" &&
                  "Enter any skill or concept to turn into an interactive learning DAG."}
                {currentStep === "survey" &&
                  "Pick a hands-on project to build and check what you already know."}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-slate-400 hover:text-white transition-colors"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ================= STEP 1: UPLOAD / ENTER GEMINI API KEY ================= */}
        {currentStep === "key" && (
          <div className="p-6 space-y-5">
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs leading-relaxed text-slate-200">
                  <div className="font-bold text-slate-100">
                    Client-Side Security Guarantee
                  </div>
                  <p>
                    Because this site runs publicly on Vercel, your Gemini API
                    key is stored only in your browser&apos;s{" "}
                    <code>localStorage</code>. It is never logged or stored on
                    any database.
                  </p>
                </div>
              </div>
            </div>

            {/* How to get a free Gemini Key */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-2 text-xs">
              <div className="font-bold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                  How to get your free Gemini API key:
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-cyan-400 hover:underline font-semibold"
                >
                  <span>Google AI Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
                <li>
                  Go to{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-300 underline"
                  >
                    aistudio.google.com/app/apikey
                  </a>
                </li>
                <li>Sign in with any Google account.</li>
                <li>
                  Click <strong>&quot;Create API key&quot;</strong> and copy it.
                </li>
                <li>Paste it in the box below to start learning!</li>
              </ol>
            </div>

            {/* Input Box */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-200">
                Paste your Gemini API Key:
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={enteredKey}
                  onChange={(e) => {
                    setEnteredKey(e.target.value);
                    setKeyValidationStatus(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleVerifyAndProceedKey();
                    }
                  }}
                  placeholder="AIzaSy..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-20 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1"
                >
                  {showKey ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>{showKey ? "Hide" : "Show"}</span>
                </button>
              </div>
            </div>

            {/* Validation Message */}
            {keyValidationStatus && (
              <div
                className={`rounded-xl border p-3 text-xs flex items-center gap-2 ${
                  keyValidationStatus.valid
                    ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-200"
                    : "border-rose-500/40 bg-rose-950/30 text-rose-200"
                }`}
              >
                {keyValidationStatus.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{keyValidationStatus.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  // Allow continuing in offline/demo mode if user has no key
                  setCurrentStep("memory");
                }}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                Continue with offline backup tutor &rarr;
              </button>

              <button
                type="button"
                onClick={handleVerifyAndProceedKey}
                disabled={!enteredKey.trim() || isValidatingKey}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-colors shadow-lg shadow-cyan-950/50"
              >
                <span>
                  {isValidatingKey ? "Checking Key..." : "Next: Memory File"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: UPLOAD MEMORY FILE OR START FROM SCRATCH ================= */}
        {currentStep === "memory" && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: Upload Memory / Notes File */}
              <div className="rounded-2xl border border-cyan-500/40 bg-slate-950/80 p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                    <FileText className="w-5 h-5" />
                    <span>Upload Notes / Memory File</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Upload an Obsidian <code>.md</code> or <code>.txt</code> file
                    containing your prior study notes. The AI will extract
                    topics and calibrate to your existing knowledge.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingFile}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-500/15 py-3 text-xs font-bold text-cyan-200 hover:bg-cyan-500/25 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>
                      {isUploadingFile
                        ? "Reading File..."
                        : "Choose .md / .txt File"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Option B: Start From Scratch */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Sparkles className="w-5 h-5" />
                    <span>Start From Scratch</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    No notes yet? No problem! Choose any topic from scratch.
                    We&apos;ll build your foundational mental model step by
                    step.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setCurrentStep("topic");
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    <span>Start From Scratch &rarr;</span>
                  </button>
                </div>
              </div>
            </div>

            {uploadError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* List of Available Kept Files (if any uploaded) */}
            {keptFiles.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  Your Active Memory Files:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto">
                  {keptFiles.map((file) => (
                    <div
                      key={file.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 flex flex-col justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-cyan-300 truncate">
                          {file.filename}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {file.snippet}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(file);
                          setCurrentStep("topic");
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors"
                      >
                        <span>Use This Note</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep("key")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back: API Key</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setCurrentStep("topic");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-950/50"
              >
                <span>Next: Topic Prompt</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: TOPIC PROMPTING ================= */}
        {currentStep === "topic" && (
          <div className="p-6 space-y-6">
            {selectedFile && (
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-3.5 py-2 text-xs text-cyan-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate">
                    Using context from: <strong>{selectedFile.filename}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-[11px] underline text-cyan-300 hover:text-white shrink-0"
                >
                  Clear note
                </button>
              </div>
            )}

            {/* Topic Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                proceedToPreSurvey(customTopic, selectedFile);
              }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder='Type any topic (e.g. "How do I git commit?", "React Fiber Architecture", "Quantum Computing")...'
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

            {/* Prompts from Kept File or Quick Starter Topics */}
            {selectedFile && selectedFile.suggestedPrompts.length > 0 ? (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300">
                  Prompts extracted from {selectedFile.filename}:
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedFile.suggestedPrompts.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => proceedToPreSurvey(p, selectedFile)}
                      className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-cyan-300 hover:border-cyan-500/50 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                    >
                      <span>{p}</span>
                      <ArrowRight className="w-3 h-3 opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400">
                  Or pick a popular starter topic:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    "How a Command Shell Works (fork & execvp)",
                    "Git Under the Hood: Blobs, Trees & Commits",
                    "How HTTPS & TLS Handshakes Work",
                    "Database Indexing & B-Trees",
                    "Async Event Loop in JavaScript & Python",
                  ].map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => proceedToPreSurvey(topic, null)}
                      className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Back Button */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep("memory")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back: Memory</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: PROJECT PICKER & PRE-SURVEY ================= */}
        {currentStep === "survey" && (
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Question 1: AI-Suggested Projects to Build */}
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
                Your learning map milestones will build toward this deliverable:
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
                  placeholder="Or type your own project deliverable..."
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

            {/* Question 2: Starting Familiarity & Confidence */}
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
                  Starting confidence ({confidenceBefore}/5)
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

            {/* Question 3: Dynamic Prerequisites */}
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">
                  3. Check anything you already know about{" "}
                  <span className="text-cyan-300">{customTopic}</span>
                </label>
                {isLoadingPrereqs && (
                  <span className="text-[11px] text-cyan-400 animate-pulse flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI analyzing prerequisites...
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
                      {active && (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {item}
                    </button>
                  );
                })}
              </div>

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
                onClick={() => setCurrentStep("topic")}
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
                <Sparkles className="w-4 h-4 fill-current" />
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
