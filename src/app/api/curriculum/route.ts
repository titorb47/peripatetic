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
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
];

function getApiKey(customKey?: string): string {
  if (customKey && customKey.trim()) {
    return customKey.trim();
  }
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
  temperature = 0.3,
  customApiKey?: string
): Promise<{
  parsed: Record<string, unknown> | null;
  modelUsed: string;
  quotaExhausted: boolean;
  errorMessage: string;
}> {
  const apiKey = getApiKey(customApiKey);
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
    project_goal: preSurvey?.selectedProject ?? {
      title: `Hands-On Project: ${cleanTopic}`,
      deliverable: `Build and verify a complete working walkthrough of ${cleanTopic}.`,
      difficulty: "Hands-On",
    },
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
    const userApiKey: string =
      typeof body.userApiKey === "string" ? body.userApiKey.trim() : "";

    // 0. Test / Validate API Key action
    if (action === "verify_api_key") {
      const keyToTest = getApiKey(userApiKey);
      if (!keyToTest) {
        return NextResponse.json({
          valid: false,
          error: "No API key provided. Please enter your Gemini API key.",
        });
      }
      try {
        let verifiedOk = false;
        let lastError = "";
        let usedModel = "gemini-3.8-flash";

        for (const testModel of VERIFIED_GEMINI_MODELS) {
          try {
            const testRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${keyToTest}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ role: "user", parts: [{ text: "Respond with OK." }] }],
                  generationConfig: { maxOutputTokens: 5 },
                }),
              }
            );
            if (testRes.ok) {
              verifiedOk = true;
              usedModel = testModel;
              break;
            }
            const errJson = await testRes.json().catch(() => ({}));
            lastError =
              errJson?.error?.message ||
              `HTTP ${testRes.status} from ${testModel}`;
          } catch (e) {
            lastError = e instanceof Error ? e.message : "Network error";
          }
        }

        if (verifiedOk) {
          return NextResponse.json({ valid: true, model: usedModel });
        }

        return NextResponse.json({
          valid: false,
          error:
            lastError ||
            "Unable to authenticate key with Gemini. Please verify your API key in Google AI Studio.",
        });
      } catch (e) {
        return NextResponse.json({
          valid: false,
          error: e instanceof Error ? e.message : "Connection failed",
        });
      }
    }

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
        0.3,
        userApiKey
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

    // 2. AI Project & Prerequisite Planner: Suggest concrete Projects + Prerequisites before creating the graph
    if (action === "prereqs") {
      const targetTopic = topicRaw || "General Topic";

      const aiRes = await callGeminiJson(
        `You are an AI Project-Based Curriculum Architect. Before creating a learning graph for "${targetTopic}", plan:
1. "suggestedProjects": 3 concrete, practical projects or real-world deliverables the user can choose to build/complete while learning "${targetTopic}" (1 Starter project, 1 Hands-On project, 1 Challenge project). Each project needs:
   - "title": short action-oriented project title (4-8 words)
   - "deliverable": 1 clear sentence describing what the user will have built, written, or solved by the end of the graph
   - "difficulty": "Starter" | "Hands-On" | "Challenge"
2. "prerequisites": 4 or 5 specific foundational concepts (2-6 words each) that are prerequisite building blocks for "${targetTopic}".
3. "planNote": 1 sentence explaining how the project milestones and branches will adapt to their selected project and known prerequisites.

Respond ONLY with valid JSON:
{
  "suggestedProjects": [
    { "title": "...", "deliverable": "...", "difficulty": "Starter" },
    { "title": "...", "deliverable": "...", "difficulty": "Hands-On" },
    { "title": "...", "deliverable": "...", "difficulty": "Challenge" }
  ],
  "prerequisites": ["...", "...", "...", "..."],
  "planNote": "..."
}`,
        `Topic to learn: "${targetTopic}"${
          fileContext ? `\nContext from user's note:\n${fileContext.slice(0, 1200)}` : ""
        }`,
        0.3,
        userApiKey
      );

      const fallbackProjects = [
        {
          title: `Starter Project: Guided Walkthrough of ${targetTopic}`,
          deliverable: `Create a step-by-step annotated example showing how ${targetTopic} works from input to output.`,
          difficulty: "Starter",
        },
        {
          title: `Hands-On Project: Build & Test ${targetTopic} in Practice`,
          deliverable: `Design, build, and verify a complete real-world workflow or implementation using ${targetTopic}.`,
          difficulty: "Hands-On",
        },
        {
          title: `Challenge Project: Troubleshoot & Optimize ${targetTopic}`,
          deliverable: `Solve realistic edge cases, failure modes, and design trade-offs in a full ${targetTopic} project.`,
          difficulty: "Challenge",
        },
      ];

      if (
        aiRes.parsed &&
        Array.isArray(aiRes.parsed.prerequisites) &&
        aiRes.parsed.prerequisites.length >= 2
      ) {
        const suggestedProjects =
          Array.isArray(aiRes.parsed.suggestedProjects) &&
          aiRes.parsed.suggestedProjects.length >= 1
            ? (aiRes.parsed.suggestedProjects as Record<string, unknown>[])
                .slice(0, 3)
                .map((p, i) => ({
                  title: String(
                    p.title || fallbackProjects[i]?.title || `Project ${i + 1}`
                  ),
                  deliverable: String(
                    p.deliverable || fallbackProjects[i]?.deliverable || ""
                  ),
                  difficulty: String(
                    p.difficulty || fallbackProjects[i]?.difficulty || "Hands-On"
                  ),
                }))
            : fallbackProjects;

        return NextResponse.json({
          suggestedProjects,
          prerequisites: aiRes.parsed.prerequisites.map(String).slice(0, 5),
          planNote:
            typeof aiRes.parsed.planNote === "string"
              ? aiRes.parsed.planNote
              : null,
          source: "live_ai",
          model_used: aiRes.modelUsed,
        });
      }

      return NextResponse.json({
        suggestedProjects: fallbackProjects,
        prerequisites: [
          `Core purpose of ${targetTopic}`,
          `Key building blocks of ${targetTopic}`,
          `Basic walkthrough of ${targetTopic}`,
          `Real-world use cases for ${targetTopic}`,
        ],
        planNote: `Pick a target project below and check any concepts you already know—your learning map will be structured as milestones to finish that project!`,
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
        0.25,
        userApiKey
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

    // 4. Full AI Project-Driven Curriculum & DAG Planner (`action === "generate"`)
    const targetTopic = topicRaw || "How a Command Shell Works";
    const selectedProject = preSurvey?.selectedProject;

    const projectDirective = selectedProject
      ? `TARGET PROJECT TO COMPLETE:
- Project Title: "${selectedProject.title}"
- Final Deliverable: "${selectedProject.deliverable}"
- Project Level: ${selectedProject.difficulty}
CRITICAL PROJECT-FIRST RULE: Every single node in the graph MUST be a concrete, hands-on Project Milestone that directly builds toward finishing "${selectedProject.title}". By the time the learner completes the final node, they will have completed the full deliverable ("${selectedProject.deliverable}")!`
      : `CRITICAL PROJECT-FIRST RULE: Design a hands-on Target Project ("project_goal") for "${targetTopic}" and make every node in the graph a concrete Project Milestone toward completing that project!`;

    const depthInstruction =
      preSurvey?.preferredDepth === "short"
        ? "Plan a concise 3-node project milestone path focusing on getting the core project working."
        : preSurvey?.preferredDepth === "deep"
        ? "Plan a thorough 6-to-8 node project milestone path covering architecture, implementation, edge-case testing, and final delivery."
        : "Autonomously choose the ideal number of project milestones (between 3 and 7 nodes) needed to build and complete the project.";

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
        }). Instead, treat those concepts as already mastered prerequisites in Node 1's "known" array, and start Milestone 1 ("n1") right at the next unmastered step of the project!`
      : "Learner Profile: Start from approachable first principles.";

    const systemPrompt = `You are an Autonomous AI Project-Based Curriculum & Knowledge-Graph Planner.
Design a project-driven learning path for "${targetTopic}" where the learner gets a real project done milestone by milestone.

PLANNING RULES:
1. ${projectDirective}
2. ${depthInstruction}
3. ${learnerCalibration}
4. Domain-Natural Project Milestones: Match the subject naturally. Each node's "practice_task" should ask the learner to build/draft/solve the next piece of the project and explain how it works in their own words.
5. Approachable, Action-Oriented Language: Keep titles and goals concrete, clear, and motivating.
6. Sequential Root Milestones: Number root nodes "n1", "n2", ..., "nK" with "parent": null.

For each node, plan:
- "id": "n1", "n2", ...
- "title": Specific 3-6 word Project Milestone title
- "goal": 1-2 sentence goal explaining what part of the project you are completing in this step
- "practice_task": Concrete hands-on task to build/write/solve this milestone of the project and explain how it works
- "explain_prompt": 1 sentence prompt for their explanation
- "verification_criteria": Array of 2 specific criteria checking both the project milestone output and conceptual understanding
- "parent_summary": How this milestone builds on the previous milestone toward the final project deliverable
- "known": Array of 1-3 prerequisite concepts assumed entering this milestone
- "open_questions": Array of 2 thought-provoking questions about this milestone

Respond ONLY with valid JSON:
{
  "topic_title": "Clean Display Title",
  "project_goal": {
    "title": "Project Title",
    "deliverable": "1-sentence description of the finished project deliverable",
    "difficulty": "Starter | Hands-On | Challenge"
  },
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

    const aiRes = await callGeminiJson(systemPrompt, userPrompt, 0.35, userApiKey);

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

      const aiProjectGoal =
        aiRes.parsed.project_goal &&
        typeof aiRes.parsed.project_goal === "object"
          ? (aiRes.parsed.project_goal as Record<string, unknown>)
          : null;

      const resolvedProjectGoal = selectedProject ?? {
        title: String(
          aiProjectGoal?.title || `Hands-On Project: ${plannedTitle}`
        ),
        deliverable: String(
          aiProjectGoal?.deliverable ||
            `Complete all milestones to build and verify ${plannedTitle}.`
        ),
        difficulty: String(aiProjectGoal?.difficulty || "Hands-On"),
      };

      const newState: AppState = {
        current_node_id: "n1",
        failed_attempts: 0,
        mastered_topics: [],
        nodes: builtNodes,
        edges: buildEdgesFromNodes(builtNodes),
        topic_title: plannedTitle,
        project_goal: resolvedProjectGoal,
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

