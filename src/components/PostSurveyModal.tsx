"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Sparkles,
  Award,
  Download,
  Compass,
  Star,
  HelpCircle,
} from "lucide-react";
import { CurriculumNode, PostSurveyData } from "@/types/schema";

interface PostSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicTitle: string;
  nodes: CurriculumNode[];
  confidenceBefore: number;
  existingSurvey?: PostSurveyData;
  onSubmitSurvey: (data: PostSurveyData) => void;
  onDownloadVault: () => void;
  onOpenNewTopic: () => void;
}

export function PostSurveyModal({
  isOpen,
  onClose,
  topicTitle,
  nodes,
  confidenceBefore,
  existingSurvey,
  onSubmitSurvey,
  onDownloadVault,
  onOpenNewTopic,
}: PostSurveyModalProps) {
  const rootNodes = nodes.filter((n) => n.parent === null);
  const firstNode = rootNodes[0];
  const lastNode = rootNodes[rootNodes.length - 1];

  const [synthesisAnswer, setSynthesisAnswer] = useState(
    existingSurvey?.synthesisAnswer ?? ""
  );
  const [appliedScenarioAnswer, setAppliedScenarioAnswer] = useState(
    existingSurvey?.appliedScenarioAnswer ?? ""
  );
  const [confidenceAfter, setConfidenceAfter] = useState<number>(
    existingSurvey?.confidenceAfter ?? 4
  );
  const [canTeachFriend, setCanTeachFriend] = useState<
    "yes" | "mostly" | "not_yet"
  >(existingSurvey?.canTeachFriend ?? "yes");
  const [submittedResult, setSubmittedResult] = useState<PostSurveyData | null>(
    existingSurvey ?? null
  );
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    if (existingSurvey) {
      setSubmittedResult(existingSurvey);
    }
  }, [existingSurvey]);

  if (!isOpen) return null;

  const scenarioQuestion =
    lastNode?.context.open_questions?.[0] ||
    firstNode?.context.open_questions?.[0] ||
    `What is the most common mistake someone might make with ${topicTitle}, and how would you avoid it?`;

  const handleEvaluateSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    const synTrim = synthesisAnswer.trim();
    const appTrim = appliedScenarioAnswer.trim();
    setIsEvaluating(true);

    let passed = synTrim.length >= 12 && appTrim.length >= 8;
    let feedbackSummary = "";

    try {
      const res = await fetch("/api/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate_survey",
          topicTitle,
          synthesisAnswer: synTrim,
          appliedScenarioAnswer: appTrim,
          confidenceBefore,
          confidenceAfter,
          nodeTitles: rootNodes.map((n) => n.title),
        }),
      });
      const data = await res.json();
      if (typeof data.passedCheck === "boolean") {
        passed = data.passedCheck;
      }
      if (typeof data.feedbackSummary === "string" && data.feedbackSummary) {
        feedbackSummary = data.feedbackSummary;
      }
    } catch {
      // Fallback if offline
    } finally {
      setIsEvaluating(false);
    }

    if (!feedbackSummary) {
      const delta = confidenceAfter - confidenceBefore;
      feedbackSummary = passed
        ? `Great job! You connected "${
            firstNode?.title || "the basics"
          }" all the way to "${
            lastNode?.title || "the big picture"
          }" in your own words. Your confidence grew from ${confidenceBefore}/5 to ${confidenceAfter}/5 (${
            delta >= 0 ? `+${delta}` : delta
          }).`
        : `Add a sentence or two more connecting the big picture and the real-world question so we can verify your understanding.`;
    }

    const result: PostSurveyData = {
      completedAt: new Date().toISOString(),
      synthesisAnswer: synTrim,
      appliedScenarioAnswer: appTrim,
      confidenceBefore,
      confidenceAfter,
      canTeachFriend,
      passedCheck: passed,
      feedbackSummary,
    };

    setSubmittedResult(result);
    onSubmitSurvey(result);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/95 text-slate-100 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="border-b border-slate-800 bg-gradient-to-r from-slate-950 via-emerald-950/30 to-slate-950 px-6 py-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Final Learning Check &amp; Reflection
              </h2>
              <p className="text-xs text-slate-400">
                Let&apos;s make sure <strong>{topicTitle}</strong> truly clicked
                from start to finish.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleEvaluateSurvey}
          className="p-6 space-y-5 max-h-[80vh] overflow-y-auto"
        >
          {/* Question 1: Big-Picture Synthesis */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-100">
              1. Connect the Dots (Big Picture)
            </label>
            <p className="text-xs text-slate-400">
              In 1–2 plain sentences, how does{" "}
              <span className="text-cyan-300 font-medium">
                {firstNode?.title ?? "Step 1"}
              </span>{" "}
              connect to{" "}
              <span className="text-emerald-300 font-medium">
                {lastNode?.title ?? "the final step"}
              </span>
              ?
            </p>
            <textarea
              rows={2}
              value={synthesisAnswer}
              onChange={(e) => setSynthesisAnswer(e.target.value)}
              placeholder="Write how the beginning and end of this topic fit together..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Question 2: Applied Scenario Check */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-100">
              2. Quick Real-World Check
            </label>
            <p className="text-xs text-amber-300/90 flex items-start gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{scenarioQuestion}</span>
            </p>
            <textarea
              rows={2}
              value={appliedScenarioAnswer}
              onChange={(e) => setAppliedScenarioAnswer(e.target.value)}
              placeholder="Your short answer in plain words..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Question 3: Confidence Before vs After & Teach-a-Friend */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-200">
                3. Your Confidence Now (Started at {confidenceBefore}/5)
              </div>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setConfidenceAfter(score)}
                    className={`flex-1 rounded-xl border py-2 text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                      confidenceAfter >= score
                        ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300"
                        : "border-slate-800 bg-slate-900 text-slate-500"
                    }`}
                  >
                    <Star className="w-3 h-3 fill-current" />
                    {score}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-200">
                4. Could you explain this to a friend?
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "yes", label: "Yes!" },
                  { id: "mostly", label: "Mostly" },
                  { id: "not_yet", label: "Not yet" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setCanTeachFriend(opt.id as "yes" | "mostly" | "not_yet")
                    }
                    className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                      canTeachFriend === opt.id
                        ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-200"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Evaluation Result Banner */}
          {submittedResult && (
            <div
              className={`rounded-2xl border p-4 space-y-3 ${
                submittedResult.passedCheck
                  ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-100"
                  : "border-amber-500/50 bg-amber-950/40 text-amber-100"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {submittedResult.passedCheck
                    ? "Learning Verified! Added to Your Notes Vault"
                    : "Keep Refining Your Summary"}
                </span>
              </div>
              <p className="text-xs leading-relaxed">
                {submittedResult.feedbackSummary}
              </p>

              {submittedResult.passedCheck && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onDownloadVault}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Notes &amp; Survey (.zip)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenNewTopic();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 transition-colors"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    Pick Another Topic
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="submit"
              disabled={isEvaluating}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-950/50"
            >
              <Sparkles className="w-4 h-4" />
              {isEvaluating ? "AI Checking..." : "Check My Learning"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

