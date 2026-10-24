"use client";

import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
  Lock,
  Unlock,
  GitBranch,
  GitMerge,
  CheckCircle2,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { MasteryLevel, NodeStatus } from "@/types/schema";

export interface CurriculumNodeData extends Record<string, unknown> {
  id: string;
  title: string;
  status: NodeStatus;
  mastery: MasteryLevel;
  parent: string | null;
  isSelected: boolean;
}

const statusConfig: Record<
  NodeStatus,
  {
    label: string;
    badgeClass: string;
    borderClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  locked: {
    label: "LOCKED",
    badgeClass: "bg-slate-800/90 text-slate-400 border-slate-700",
    borderClass: "border-slate-800 bg-slate-900/75 opacity-75",
    icon: Lock,
  },
  open: {
    label: "OPEN",
    badgeClass: "bg-cyan-950/90 text-cyan-300 border-cyan-500/40",
    borderClass: "border-cyan-500/60 bg-slate-900/95 shadow-lg shadow-cyan-950/50",
    icon: Unlock,
  },
  branched: {
    label: "BRANCHED",
    badgeClass: "bg-amber-950/90 text-amber-300 border-amber-500/40",
    borderClass: "border-amber-500/70 bg-slate-900/95 shadow-lg shadow-amber-950/40",
    icon: GitBranch,
  },
  merged: {
    label: "MERGED",
    badgeClass: "bg-emerald-950/90 text-emerald-300 border-emerald-500/40",
    borderClass: "border-emerald-500/60 bg-slate-900/95 shadow-lg shadow-emerald-950/40",
    icon: GitMerge,
  },
};

const masteryConfig: Record<
  MasteryLevel,
  { label: string; pillClass: string }
> = {
  seen: {
    label: "seen",
    pillClass: "bg-slate-800 text-slate-300 border-slate-600",
  },
  explained: {
    label: "explained",
    pillClass: "bg-blue-950/80 text-blue-300 border-blue-500/40",
  },
  practiced: {
    label: "practiced",
    pillClass: "bg-purple-950/80 text-purple-300 border-purple-500/40",
  },
  independent: {
    label: "independent",
    pillClass: "bg-emerald-950/90 text-emerald-300 border-emerald-500/50",
  },
};

export function CurriculumNodeCard({ data }: NodeProps) {
  const nodeData = data as unknown as CurriculumNodeData;
  const statusInfo = statusConfig[nodeData.status] ?? statusConfig.open;
  const masteryInfo = masteryConfig[nodeData.mastery] ?? masteryConfig.seen;
  const StatusIcon = statusInfo.icon;
  const isBranch = nodeData.parent !== null;

  return (
    <div
      className={`relative w-[235px] rounded-xl border-2 p-3.5 transition-all duration-200 select-none ${
        statusInfo.borderClass
      } ${
        nodeData.isSelected
          ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-[1.03]"
          : "hover:border-slate-600"
      }`}
    >
      {/* Left Handle for branch nodes (sprouting horizontally to the right of trunk) */}
      {isBranch && (
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          className="!w-3 !h-3 !bg-amber-400 !border-2 !border-slate-950"
        />
      )}

      {/* Top Handle for root sequential nodes (vertical top-down trunk) */}
      {!isBranch && (
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-slate-950"
        />
      )}

      {/* Header row: Node ID + Status Badge */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs font-bold border ${
            isBranch
              ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
              : "bg-slate-800 text-cyan-300 border-slate-700"
          }`}
        >
          {isBranch ? <GitBranch className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
          {nodeData.id}
        </span>

        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider border ${statusInfo.badgeClass}`}
        >
          <StatusIcon className="w-3 h-3" />
          {statusInfo.label}
        </span>
      </div>

      {/* Node Title */}
      <h3 className="text-xs font-semibold text-slate-100 leading-snug mb-3 line-clamp-2 min-h-[2.25rem]">
        {nodeData.title}
      </h3>

      {/* Footer row: Mastery Pill */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">
          Mastery
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border ${masteryInfo.pillClass}`}
        >
          {nodeData.mastery === "independent" ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          ) : (
            <Sparkles className="w-2.5 h-2.5 opacity-75" />
          )}
          {masteryInfo.label}
        </span>
      </div>

      {/* Bottom Handle for root sequential nodes (vertical top-down trunk) */}
      {!isBranch && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-slate-950"
        />
      )}

      {/* Right Handle for spawning remediation branches horizontally (on both root and branch nodes) */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2.5 !h-2.5 !bg-amber-400 !border-2 !border-slate-950"
      />
    </div>
  );
}

