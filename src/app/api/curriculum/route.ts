import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  AppState,
  AppStateSchema,
  CurriculumNode,
  KeptFileItem,
  PreSurveyData,
} from "@/types/schema";

const VERIFIED_GEMINI_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
];

function getApiKey(): string {
  return (
    process.env.AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  ).trim();
}

async function callGeminiJson(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.3
): Promise<{
  parsed: Record<string, unknown> | null;
  modelUsed: string;
  quotaExhausted: boolean;
  errorMessage: string;
}> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      parsed: null,
      modelUsed: "none",
      quotaExhausted: false,
      errorMessage: "No API key configured",
    };
  }

  let quotaExhausted = false;
  let errorMessage = "";

  for (const modelName of VERIFIED_GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature,
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const rawText = (data?.candidates?.[0]?.content?.parts ?? [])
          .map((p: { text?: string }) => p.text ?? "")
          .join("\n")
          .trim();
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            parsed,
            modelUsed: modelName,
            quotaExhausted: false,
            errorMessage: "",
          };
        }
      } else if (res.status === 429 || res.status === 503) {
        quotaExhausted = true;
        const errJson = await res.json().catch(() => ({}));
        errorMessage =
          errJson?.error?.message || `HTTP ${res.status} on ${modelName}`;
      } else {
        const errJson = await res.json().catch(() => ({}));
        errorMessage =
          errJson?.error?.message || `HTTP ${res.status} on ${modelName}`;
      }
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : "Network error";
    }
  }

  return {
    parsed: null,
    modelUsed: "fallback",
    quotaExhausted,
    errorMessage,
  };
}

function extractFallbackPrompts(filename: string, content: string): string[] {
  const headings = Array.from(content.matchAll(/^#{1,3}\s+(.+)$/gm))
    .map((m) => m[1].trim())
    .filter((h) => h.length > 3 && h.length < 65);
  if (headings.length > 0) return headings.slice(0, 3);
  const baseName = filename
    .replace(/\.(md|txt)$/i, "")
    .replace(/[-_]/g, " ")
    .trim();
  return [`Learn ${baseName}`];
}

export async function GET() {
  try {
    const dirPath = path.join(process.cwd(), "kept-notes");
    const entries = await fs.readdir(dirPath).catch(() => [] as string[]);
    const rawFiles: { filename: string; content: string }[] = [];

    for (const fname of entries) {
      if (!fname.endsWith(".md") && !fname.endsWith(".txt")) continue;
      const fullPath = path.join(dirPath, fname);
      const raw = await fs.readFile(fullPath, "utf8").catch(() => "");
      if (raw.trim()) {
        rawFiles.push({ filename: fname, content: raw.slice(0, 2000) });
      }
    }

    if (rawFiles.length === 0) {
      return NextResponse.json({ keptFiles: [], kept_files: [] });
    }

    // Let the AI read the kept files and plan custom learning prompts for each file
    const aiResult = await callGeminiJson(
      `You are an AI Study Planner. Read the user's kept notes files and suggest 2 or 3 concise, engaging learning topics/questions (3-8 words each) for each file that the user can click to start a first-principles learning path. Also write a 1-sentence summary snippet of the file.
Respond ONLY with valid JSON:
{
  "files": [
    {
      "filename": "string",
      "snippet": "string",
      "suggestedPrompts": ["string", "string", "string"]
    }
  ]
}`,
      `Here are the user's kept files on disk:\n${rawFiles
        .map((f) => `=== FILE: ${f.filename} ===\n${f.content}`)
        .join("\n\n")}`,
      0.3
    );

    const aiFilesMap = new Map<
      string,
      { snippet?: string; suggestedPrompts?: string[] }
    >();
    if (aiResult.parsed && Array.isArray(aiResult.parsed.files)) {
      for (const item of aiResult.parsed.files as Record<string, unknown>[]) {
        if (typeof item.filename === "string") {
          aiFilesMap.set(item.filename, {
            snippet:
              typeof item.snippet === "string" ? item.snippet : undefined,
            suggestedPrompts: Array.isArray(item.suggestedPrompts)
              ? item.suggestedPrompts.map(String).slice(0, 3)
              : undefined,
          });
        }
      }
    }

    const keptFiles: KeptFileItem[] = rawFiles.map((f) => {
      const aiEntry = aiFilesMap.get(f.filename);
      const fallbackSnippet = f.content
        .replace(/^---[\s\S]*?---/, "")
        .replace(/^#+.+$/gm, "")
        .replace(/[*`]/g, "")
        .trim()
        .slice(0, 140);

      return {
        id: `disk-${f.filename}`,
        filename: f.filename,
        snippet: aiEntry?.snippet || fallbackSnippet || `Notes from ${f.filename}`,
        suggestedPrompts:
          aiEntry?.suggestedPrompts && aiEntry.suggestedPrompts.length > 0
            ? aiEntry.suggestedPrompts
            : extractFallbackPrompts(f.filename, f.content),
      };
    });

    return NextResponse.json({ keptFiles, kept_files: keptFiles });
  } catch {
    return NextResponse.json({ keptFiles: [], kept_files: [] });
  }
}

function buildEdgesFromNodes(nodes: CurriculumNode[]) {
  const rootNodes = nodes.filter((n) => n.parent === null);
  const edges: {
    id: string;
    source: string;
    target: string;
    animated?: boolean;
  }[] = [];

  for (let i = 0; i < rootNodes.length - 1; i++) {
    const src = rootNodes[i];
    const tgt = rootNodes[i + 1];
    edges.push({
      id: `e-${src.id}-${tgt.id}`,
      source: src.id,
      target: tgt.id,
      animated:
        src.status === "open" ||
        (src.status === "merged" && tgt.status === "open"),
    });
  }

  for (const node of nodes) {
    if (node.parent) {
      edges.push({
        id: `e-${node.parent}-${node.id}`,
        source: node.parent,
        target: node.id,
        animated: node.status === "open",
      });
    }
  }

  return edges;
}

function buildMinimalOfflineFallback(
  topic: string,
  preSurvey?: PreSurveyData
): AppState {
  const cleanTopic = topic.trim() || "First-Principles Topic";
  const count =
    preSurvey?.preferredDepth === "short"
      ? 3
      : preSurvey?.preferredDepth === "deep"
      ? 6
      : 4;

  const nodes: CurriculumNode[] = Array.from({ length: count }, (_, idx) => {
    const id = `n${idx + 1}`;
    const title =
      idx === 0
        ? `Core Mental Model of ${cleanTopic}`
        : idx === count - 1
        ? `Applying & Synthesizing ${cleanTopic}`
        : `Step ${idx + 1}: Mechanism & Flow of ${cleanTopic}`;
    return {
      id,
      parent: null,
      title,
      status: idx === 0 ? "open" : "locked",
      mastery: "seen",
      position: { x: 180, y: idx * 175 },
      context: {
        goal: `Build a clear, first-principles mental model for ${title}.`,
        practice_task: `Explain how "${title}" works in your own words and provide a concrete example.`,
        explain_prompt: `Explain ${title} without jargon.`,
        verification_criteria: [
          `Explains the core idea of ${title} clearly`,
          `Provides a concrete example or walkthrough`,
        ],
        parent_summary:
          idx === 0
            ? `Starting point for ${cleanTopic}`
            : `Builds on Step ${idx} of ${cleanTopic}`,
        known:
          idx === 0
            ? preSurvey?.knownPrerequisites?.length
              ? preSurvey.knownPrerequisites
              : ["Everyday intuition"]
            : [`Completed n${idx}`],
        misconception: null,
        open_questions: [`Why is ${title} essential to ${cleanTopic}?`],
      },
      user_submission: { hypothesis: "", stuck_at: "", code_or_output: "" },
      merge_note_md: `---\nid: ${id}\nparent: null\ntitle: "${title.replace(/"/g, '\\"')}"\nmastery: seen\n---\n\n# ${id}: ${title}\n`,
    };
  });

  return {
    current_node_id: "n1",
    failed_attempts: 0,
    mastered_topics: [],
    nodes,
    edges: buildEdgesFromNodes(nodes),
    topic_title: cleanTopic,
    pre_survey: preSurvey,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "generate";
    const topicRaw = typeof body.topic === "string" ? body.topic.trim() : "";
    const preSurvey: PreSurveyData | undefined = body.preSurvey;
    const fileContext: string =
      typeof body.fileContext === "string" ? body.fileContext.trim() : "";

    // 1. AI File Analyzer: Plan learning prompts from an uploaded .md / .txt note
    if (action === "analyze_file") {
      const filename =
        typeof body.filename === "string" ? body.filename : "note.md";
      const content =
        typeof body.content === "string" ? body.content.slice(0, 3000) : "";

      const aiRes = await callGeminiJson(
        `You are an AI Study Planner. Analyze the uploaded note and generate:
1. "snippet": a 1-sentence summary of what the note covers.
2. "suggestedPrompts": 3 specific, engaging learning topics or questions (3-8 words each) drawn from the note.
Respond ONLY with JSON: { "snippet": "...", "suggestedPrompts": ["...", "...", "..."] }`,
        `Filename: ${filename}\nContent:\n${content}`,
        0.3
      );

      if (aiRes.parsed) {
        const snippet =
          typeof aiRes.parsed.snippet === "string"
            ? aiRes.parsed.snippet
            : content.slice(0, 140);
        const suggestedPrompts = Array.isArray(aiRes.parsed.suggestedPrompts)
          ? aiRes.parsed.suggestedPrompts.map(String).slice(0, 3)
          : extractFallbackPrompts(filename, content);
        return NextResponse.json({
          snippet,
          suggestedPrompts,
          source: "live_ai",
        });
      }

      return NextResponse.json({
        snippet: content.replace(/[#*`]/g, "").trim().slice(0, 140),
        suggestedPrompts: extractFallbackPrompts(filename, content),
        source: "fallback",
      });
    }

    // 2. AI Prerequisite Planner: Discover specific prerequisites & planning note for ANY topic
    if (action === "prereqs") {
      const targetTopic = topicRaw || "General Topic";

      const aiRes = await callGeminiJson(
        `You are an AI Curriculum Architect. Given a topic the user wants to learn (and optional file context), identify:
1. "prerequisites": 4 or 5 specific, concrete foundational concepts (2-6 words each) that are prerequisite building blocks for "${targetTopic}". Make them genuinely specific to "${targetTopic}" (never generic placeholders).
2. "planNote": a 1-sentence note explaining how you will adapt the learning graph based on which prerequisites they check off.
3. "recommendedQuestion": 1 short diagnostic question to gauge their starting intuition.
Respond ONLY with valid JSON:
{
  "prerequisites": ["...", "...", "...", "..."],
  "planNote": "...",
  "recommendedQuestion": "..."
}`,
        `Topic to learn: "${targetTopic}"${
          fileContext ? `\nContext from user's note:\n${fileContext.slice(0, 1200)}` : ""
        }`,
        0.25
      );

      if (
        aiRes.parsed &&
        Array.isArray(aiRes.parsed.prerequisites) &&
        aiRes.parsed.prerequisites.length >= 2
      ) {
        return NextResponse.json({
          prerequisites: aiRes.parsed.prerequisites.map(String).slice(0, 5),
          planNote:
            typeof aiRes.parsed.planNote === "string"
              ? aiRes.parsed.planNote
              : null,
          recommendedQuestion:
            typeof aiRes.parsed.recommendedQuestion === "string"
              ? aiRes.parsed.recommendedQuestion
              : null,
          source: "live_ai",
          model_used: aiRes.modelUsed,
        });
      }

      return NextResponse.json({
        prerequisites: [
          `Core purpose of ${targetTopic}`,
          `Key building blocks of ${targetTopic}`,
          `Basic walkthrough of ${targetTopic}`,
          `Real-world use cases for ${targetTopic}`,
        ],
        planNote: `I'll design a custom step-by-step path for "${targetTopic}" starting right after any concepts you check above.`,
        recommendedQuestion: null,
        source: "fallback",
      });
    }

    // 3. AI End-of-Path Survey Evaluator: Check if true learning happened
    if (action === "evaluate_survey") {
      const topicTitle =
        typeof body.topicTitle === "string" ? body.topicTitle : "Learning Path";
      const synthesisAnswer =
        typeof body.synthesisAnswer === "string" ? body.synthesisAnswer : "";
      const appliedScenarioAnswer =
        typeof body.appliedScenarioAnswer === "string"
          ? body.appliedScenarioAnswer
          : "";
      const confidenceBefore =
        typeof body.confidenceBefore === "number" ? body.confidenceBefore : 2;
      const confidenceAfter =
        typeof body.confidenceAfter === "number" ? body.confidenceAfter : 4;
      const nodeTitles: string[] = Array.isArray(body.nodeTitles)
        ? body.nodeTitles.map(String)
        : [];

      const aiRes = await callGeminiJson(
        `You are a supportive Feynman Learning Evaluator. The learner just finished a learning path on "${topicTitle}" covering these steps: ${nodeTitles.join(
          " -> "
        )}.
Evaluate their two reflection answers:
1. Determine if genuine understanding is demonstrated ("passedCheck": boolean). Be encouraging—pass them if they show a reasonable mental model in their own words, or set false with a helpful hint if their answer is empty/nonsense.
2. Write a personalized 2-3 sentence "feedbackSummary" commenting directly on their specific explanation and noting their confidence change (${confidenceBefore}/5 -> ${confidenceAfter}/5).
Respond ONLY with valid JSON:
{
  "passedCheck": boolean,
  "feedbackSummary": "string"
}`,
        `Learner's Big-Picture Synthesis Answer: "${synthesisAnswer}"\nLearner's Applied Scenario Answer: "${appliedScenarioAnswer}"`,
        0.25
      );

      if (aiRes.parsed && typeof aiRes.parsed.feedbackSummary === "string") {
        return NextResponse.json({
          passedCheck: Boolean(aiRes.parsed.passedCheck),
          feedbackSummary: aiRes.parsed.feedbackSummary,
          source: "live_ai",
        });
      }

      const passed =
        synthesisAnswer.trim().length >= 12 &&
        appliedScenarioAnswer.trim().length >= 8;
      return NextResponse.json({
        passedCheck: passed,
        feedbackSummary: passed
          ? `Nice work! You connected ${nodeTitles[0] || "the starting concept"} through ${
              nodeTitles[nodeTitles.length - 1] || "the final step"
            } and grew your confidence from ${confidenceBefore}/5 to ${confidenceAfter}/5.`
          : `Add a bit more detail explaining how the steps connect and how you'd handle the scenario so we can verify your mental model.`,
        source: "fallback",
      });
    }

    // 4. Full AI Curriculum & DAG Planner (`action === "generate"`)
    const targetTopic = topicRaw || "How a Command Shell Works";

    const depthInstruction =
      preSurvey?.preferredDepth === "short"
        ? "Plan a concise 3-node path focusing on the most essential mechanisms."
        : preSurvey?.preferredDepth === "deep"
        ? "Plan a thorough 6-to-8 node path that explores underlying mechanisms, edge cases, and synthesis."
        : "Autonomously choose the ideal number of nodes (anywhere from 3 to 7 nodes) based on the true conceptual complexity of the topic.";

    const learnerCalibration = preSurvey
      ? `Learner Profile:
- Experience Level: ${preSurvey.experienceLevel}
- Initial Confidence: ${preSurvey.confidenceBefore}/5
- Concepts Already Known by Learner: ${
          preSurvey.knownPrerequisites.length > 0
            ? preSurvey.knownPrerequisites.join(", ")
            : "None — start from foundational first principles"
        }
CRITICAL PLANNING RULE FOR KNOWN CONCEPTS: Do NOT create introductory nodes that merely repeat what the learner already knows (${
          preSurvey.knownPrerequisites.join(", ") || "none"
        }). Instead, treat those concepts as already mastered prerequisites in Node 1's "known" array, and start Node 1 ("n1") right at the next unmastered concept! Adjust the depth and tasks to match a "${
          preSurvey.experienceLevel
        }" learner.`
      : "Learner Profile: Start from approachable first principles.";

    const systemPrompt = `You are an Autonomous AI Curriculum & Knowledge-Graph Planner.
Design a completely custom, first-principles learning path for the user's topic: "${targetTopic}".

PLANNING RULES:
1. ${depthInstruction}
2. ${learnerCalibration}
3. Domain-Natural Tasks: Match the subject naturally (e.g., if it's Git, use Git workflows/commands; if it's biology, chemistry, history, cooking, finance, or math, use real examples/formulas/scenarios from that field; if it's systems programming, use code/syscalls). Never force Python or POSIX unless the topic is about them.
4. Approachable, Clear Language: Avoid intimidating academic jargon. Every goal and task should be clear and inviting.
5. Sequential Root Nodes: Number root nodes "n1", "n2", ..., "nK" with "parent": null.

For each node, plan:
- "id": "n1", "n2", ...
- "title": Specific 3-6 word title for this concept
- "goal": 1-2 sentence clear learning goal
- "practice_task": Concrete, engaging prompt asking the learner to explain a mechanism or walk through a short example in their own words
- "explain_prompt": 1 sentence prompt for their Feynman explanation
- "verification_criteria": Array of 2 specific criteria the AI tutor will check to verify mastery of this node
- "parent_summary": How this node connects to the previous node (or why it's the starting frontier based on what they already know)
- "known": Array of 1-3 prerequisite concepts assumed entering this node
- "open_questions": Array of 2 thought-provoking Socratic questions for this node

Respond ONLY with valid JSON:
{
  "topic_title": "Clean Display Title for the Topic",
  "nodes": [
    {
      "id": "n1",
      "title": "...",
      "goal": "...",
      "practice_task": "...",
      "explain_prompt": "...",
      "verification_criteria": ["...", "..."],
      "parent_summary": "...",
      "known": ["..."],
      "open_questions": ["...", "..."]
    }
  ]
}`;

    const userPrompt = `Plan a tailored learning graph for: "${targetTopic}".${
      fileContext
        ? `\n\nIncorporate relevant concepts from the user's study file:\n${fileContext.slice(
            0,
            2000
          )}`
        : ""
    }`;

    const aiRes = await callGeminiJson(systemPrompt, userPrompt, 0.35);

    if (
      aiRes.parsed &&
      Array.isArray(aiRes.parsed.nodes) &&
      aiRes.parsed.nodes.length >= 2 &&
      aiRes.parsed.nodes.length <= 10
    ) {
      const plannedTitle =
        typeof aiRes.parsed.topic_title === "string" &&
        aiRes.parsed.topic_title.trim()
          ? aiRes.parsed.topic_title.trim()
          : targetTopic;

      const builtNodes: CurriculumNode[] = aiRes.parsed.nodes.map(
        (item: Record<string, unknown>, idx: number) => {
          const id = `n${idx + 1}`;
          const title = String(item.title || `Step ${idx + 1}`);
          const goal = String(item.goal || "");
          const practice_task = String(item.practice_task || "");
          const explain_prompt = String(
            item.explain_prompt || `Explain ${title} in your own words.`
          );
          const verification_criteria = Array.isArray(
            item.verification_criteria
          )
            ? item.verification_criteria.map(String).filter(Boolean)
            : [
                `Explains the mechanism of ${title}`,
                `Walks through a concrete example`,
              ];
          const parent_summary = String(
            item.parent_summary ||
              (idx === 0
                ? `Tailored starting point for ${plannedTitle}`
                : `Builds on Step ${idx} (${
                    (aiRes.parsed?.nodes as Record<string, unknown>[])?.[
                      idx - 1
                    ]?.title || `n${idx}`
                  })`)
          );
          const known = Array.isArray(item.known)
            ? item.known.map(String).filter(Boolean)
            : idx === 0 && preSurvey?.knownPrerequisites?.length
            ? preSurvey.knownPrerequisites
            : [`Step ${idx}`];
          const open_questions = Array.isArray(item.open_questions)
            ? item.open_questions.map(String).filter(Boolean)
            : [`How does ${title} behave in an edge case?`];

          return {
            id,
            parent: null,
            title,
            status: idx === 0 ? "open" : "locked",
            mastery: "seen",
            position: { x: 180, y: idx * 175 },
            context: {
              goal,
              practice_task,
              explain_prompt,
              verification_criteria:
                verification_criteria.length > 0
                  ? verification_criteria
                  : [`Explains ${title} clearly`],
              parent_summary,
              known,
              misconception: null,
              open_questions:
                open_questions.length > 0
                  ? open_questions
                  : [`Why does ${title} matter?`],
            },
            user_submission: {
              hypothesis: "",
              stuck_at: "",
              code_or_output: "",
            },
            merge_note_md: `---\nid: ${id}\nparent: null\ntitle: "${title.replace(
              /"/g,
              '\\"'
            )}"\nmastery: seen\n---\n\n# ${id}: ${title}\n\n## Goal\n${goal}\n`,
          };
        }
      );

      const newState: AppState = {
        current_node_id: "n1",
        failed_attempts: 0,
        mastered_topics: [],
        nodes: builtNodes,
        edges: buildEdgesFromNodes(builtNodes),
        topic_title: plannedTitle,
        pre_survey: preSurvey,
      };

      const validated = AppStateSchema.safeParse(newState);
      if (validated.success) {
        return NextResponse.json({
          state: validated.data,
          ai_meta: {
            source: "live_ai",
            model_used: aiRes.modelUsed,
            warning_message: null,
          },
        });
      }
    }

    return NextResponse.json({
      state: buildMinimalOfflineFallback(targetTopic, preSurvey),
      ai_meta: {
        source: aiRes.quotaExhausted
          ? "quota_exhausted"
          : !getApiKey()
          ? "no_api_key"
          : "error_fallback",
        model_used: "Offline Backup Planner",
        warning_message: aiRes.quotaExhausted
          ? `AI quota reached (${aiRes.errorMessage}) — used minimal offline backup planner.`
          : `Live AI unreachable (${aiRes.errorMessage}) — used minimal offline backup planner.`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to plan curriculum",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

