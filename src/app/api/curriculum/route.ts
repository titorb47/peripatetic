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
import { INITIAL_APP_STATE } from "@/data/seedNodes";

function extractPromptsFromMarkdownContent(
  filename: string,
  content: string
): string[] {
  const headings = Array.from(content.matchAll(/^#{2,3}\s+(.+)$/gm))
    .map((m) => m[1].trim())
    .filter((h) => h.length > 3 && h.length < 60);

  if (headings.length > 0) {
    return headings.slice(0, 3);
  }

  const h1 = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const baseName = filename
    .replace(/\.(md|txt)$/i, "")
    .replace(/[-_]/g, " ")
    .trim();
  return [h1 || `Learn ${baseName}`];
}

export async function GET() {
  try {
    const dirPath = path.join(process.cwd(), "kept-notes");
    const entries = await fs.readdir(dirPath).catch(() => [] as string[]);
    const keptFiles: KeptFileItem[] = [];

    for (const fname of entries) {
      if (!fname.endsWith(".md") && !fname.endsWith(".txt")) continue;
      const fullPath = path.join(dirPath, fname);
      const raw = await fs.readFile(fullPath, "utf8").catch(() => "");
      if (!raw.trim()) continue;

      const cleanSnippet = raw
        .replace(/^---[\s\S]*?---/, "")
        .replace(/^#+.+$/gm, "")
        .replace(/[*`]/g, "")
        .trim()
        .slice(0, 140);

      keptFiles.push({
        id: `disk-${fname}`,
        filename: fname,
        snippet: cleanSnippet || `Notes from ${fname}`,
        suggestedPrompts: extractPromptsFromMarkdownContent(fname, raw),
      });
    }

    return NextResponse.json({ keptFiles });
  } catch {
    return NextResponse.json({ keptFiles: [] });
  }
}

function buildFallbackPrerequisites(topic: string): string[] {
  const clean = topic.trim() || "this topic";
  return [
    `What "${clean}" is used for`,
    `Basic terms & vocabulary of ${clean}`,
    `How a simple example of ${clean} works`,
    `Common mistakes to avoid in ${clean}`,
  ];
}

function buildSequentialEdges(nodes: CurriculumNode[]) {
  const rootNodes = nodes.filter((n) => n.parent === null);
  const edges: { id: string; source: string; target: string; animated?: boolean }[] = [];
  for (let i = 0; i < rootNodes.length - 1; i++) {
    const src = rootNodes[i];
    const tgt = rootNodes[i + 1];
    edges.push({
      id: `e-${src.id}-${tgt.id}`,
      source: src.id,
      target: tgt.id,
      animated: src.status === "open" || (src.status === "merged" && tgt.status === "open"),
    });
  }
  return edges;
}

function applyPreSurveyCalibration(
  state: AppState,
  preSurvey?: PreSurveyData,
  topicTitle?: string
): AppState {
  const rootNodes = state.nodes.filter((n) => n.parent === null);
  if (!preSurvey || rootNodes.length === 0) {
    return {
      ...state,
      topic_title: topicTitle || state.topic_title || "Learning Path",
      edges: buildSequentialEdges(state.nodes),
    };
  }

  // Determine how many introductory nodes to pre-complete based on prerequisite survey
  let skipCount = 0;
  if (preSurvey.experienceLevel === "intermediate" && rootNodes.length >= 3) {
    skipCount = 1;
  } else if (preSurvey.experienceLevel === "advanced" && rootNodes.length >= 4) {
    skipCount = 2;
  } else if (preSurvey.knownPrerequisites.length >= 2 && rootNodes.length >= 3) {
    skipCount = 1;
  }

  const masteredIds: string[] = [];
  const calibratedNodes: CurriculumNode[] = state.nodes.map((node, idx) => {
    if (idx < skipCount) {
      masteredIds.push(node.id);
      return {
        ...node,
        status: "merged",
        mastery: "independent",
        context: {
          ...node.context,
          known: [
            ...node.context.known,
            ...preSurvey.knownPrerequisites,
            `Pre-verified via Prerequisite Check (${preSurvey.experienceLevel})`,
          ],
        },
      };
    }
    if (idx === skipCount) {
      return {
        ...node,
        status: "open",
        context: {
          ...node.context,
          known: [
            ...node.context.known,
            ...preSurvey.knownPrerequisites,
          ],
        },
      };
    }
    return {
      ...node,
      status: "locked",
    };
  });

  const activeNode =
    calibratedNodes.find((n) => n.status === "open") ?? calibratedNodes[0];

  return {
    ...state,
    current_node_id: activeNode.id,
    mastered_topics: masteredIds,
    nodes: calibratedNodes,
    edges: buildSequentialEdges(calibratedNodes),
    topic_title: topicTitle || state.topic_title || "Learning Path",
    pre_survey: preSurvey,
  };
}

const CURATED_TOPICS: Record<string, CurriculumNode[]> = {
  "tcp-http": [
    {
      id: "n1",
      parent: null,
      title: "Socket Creation (socket.socket)",
      status: "open",
      mastery: "seen",
      position: { x: 180, y: 0 * 175 },
      context: {
        goal: "Create an IPv4 TCP stream socket (AF_INET, SOCK_STREAM) and configure SO_REUSEADDR so restarts don't fail with EADDRINUSE.",
        practice_task:
          "Write a Python snippet using socket.socket(socket.AF_INET, socket.SOCK_STREAM) and setsockopt(SOL_SOCKET, SO_REUSEADDR, 1).",
        explain_prompt:
          "Explain why a kernel socket is also represented by an integer file descriptor and why TIME_WAIT causes Address Already in Use.",
        verification_criteria: [
          "Creates AF_INET, SOCK_STREAM socket",
          "Sets SO_REUSEADDR option",
        ],
        parent_summary: "Entry point of our POSIX TCP/HTTP Server from scratch.",
        known: ["Basic Python networking", "POSIX file descriptors"],
        misconception: null,
        open_questions: ["Why does TCP hold a port in TIME_WAIT after closing?"],
      },
      user_submission: { hypothesis: "", stuck_at: "", code_or_output: "" },
      merge_note_md: `---\nid: n1\nparent: null\ntitle: "Socket Creation (socket.socket)"\nmastery: seen\n---\n# n1: Socket Creation (socket.socket)\n`,
    },
    {
      id: "n2",
      parent: null,
      title: "Binding & Listening (bind & listen)",
      status: "locked",
      mastery: "seen",
      position: { x: 180, y: 1 * 175 },
      context: {
        goal: "Bind the socket FD to (host, port) and transition it into a passive listening socket with a kernel backlog queue.",
        practice_task:
          "Call sock.bind(('127.0.0.1', 8080)) and sock.listen(128) to accept incoming TCP 3-way handshakes.",
        explain_prompt:
          "Explain what the kernel SYN/accept backlog queue holds before accept() is called.",
        verification_criteria: [
          "Calls bind((host, port))",
          "Calls listen(backlog)",
        ],
        parent_summary: "Once the socket FD exists (n1), we bind it to a local port.",
        known: ["Socket FD creation (n1)"],
        misconception: null,
        open_questions: ["What happens when the listen backlog fills up?"],
      },
      user_submission: { hypothesis: "", stuck_at: "", code_or_output: "" },
      merge_note_md: `---\nid: n2\nparent: null\ntitle: "Binding & Listening (bind & listen)"\nmastery: seen\n---\n# n2: Binding & Listening\n`,
    },
    {
      id: "n3",
      parent: null,
      title: "Accepting Connections (accept)",
      status: "locked",
      mastery: "seen",
      position: { x: 180, y: 2 * 175 },
      context: {
        goal: "Understand how sock.accept() blocks until a client connects and returns a brand-new connected socket FD while the listening socket stays open.",
        practice_task:
          "Write a loop calling client_sock, addr = sock.accept() and explain why accept() creates a second file descriptor.",
        explain_prompt:
          "Distinguish the passive listening socket FD from the per-client connected socket FD.",
        verification_criteria: [
          "Unpacks client_sock, addr = sock.accept()",
          "Explains dual socket FDs",
        ],
        parent_summary: "With the socket listening (n2), we dequeue established connections.",
        known: ["Socket creation (n1)", "bind & listen (n2)"],
        misconception: null,
        open_questions: ["Why doesn't the server read/write directly on the listening socket?"],
      },
      user_submission: { hypothesis: "", stuck_at: "", code_or_output: "" },
      merge_note_md: `---\nid: n3\nparent: null\ntitle: "Accepting Connections (accept)"\nmastery: seen\n---\n# n3: Accepting Connections\n`,
    },
    {
      id: "n4",
      parent: null,
      title: "Parsing Raw HTTP/1.1 Requests (recv)",
      status: "locked",
      mastery: "seen",
      position: { x: 180, y: 3 * 175 },
      context: {
        goal: "Read raw byte streams via client_sock.recv(4096), split on \\r\\n\\r\\n, and parse the HTTP method, path, and headers.",
        practice_task:
          "Read bytes from client_sock.recv(4096), decode UTF-8, and extract the request line (e.g., GET /index.html HTTP/1.1).",
        explain_prompt:
          "Explain why TCP is a byte stream (not a message queue) and why \\r\\n\\r\\n marks the end of HTTP headers.",
        verification_criteria: [
          "Calls recv() and decodes bytes",
          "Splits request line / headers on CRLF (\\r\\n)",
        ],
        parent_summary: "Once a client FD is accepted (n3), we read raw bytes from the kernel receive buffer.",
        known: ["accept() connected FD (n3)"],
        misconception: null,
        open_questions: ["Why might a single recv() call return only half of an HTTP request?"],
      },
      user_submission: { hypothesis: "", stuck_at: "", code_or_output: "" },
      merge_note_md: `---\nid: n4\nparent: null\ntitle: "Parsing Raw HTTP/1.1 Requests (recv)"\nmastery: seen\n---\n# n4: Parsing Raw HTTP/1.1 Requests\n`,
    },
    {
      id: "n5",
      parent: null,
      title: "Sending Framed Responses (sendall & close)",
      status: "locked",
      mastery: "seen",
      position: { x: 180, y: 4 * 175 },
      context: {
        goal: "Construct a valid HTTP/1.1 200 OK response with Content-Length, transmit all bytes via sendall(), and close the client FD.",
        practice_task:
          "Format b'HTTP/1.1 200 OK\\r\\nContent-Length: 12\\r\\n\\r\\nHello World!' and send it via client_sock.sendall(), then close client_sock.",
        explain_prompt:
          "Explain why the browser spins forever if neither Content-Length nor client_sock.close() is provided.",
        verification_criteria: [
          "Formats valid HTTP status line & headers with \\r\\n\\r\\n",
          "Calls sendall() and close()",
        ],
        parent_summary: "Completes the request-response cycle over our POSIX TCP socket.",
        known: ["Socket (n1)", "Bind/Listen (n2)", "Accept (n3)", "Recv (n4)"],
        misconception: null,
        open_questions: ["What is the difference between send() and sendall() in Python?"],
      },
      user_submission: { hypothesis: "", stuck_at: "", code_or_output: "" },
      merge_note_md: `---\nid: n5\nparent: null\ntitle: "Sending Framed Responses (sendall & close)"\nmastery: seen\n---\n# n5: Sending Framed Responses\n`,
    },
  ],
  "git-internals": [
    {
      id: "n1",
      parent: null,
      title: "Content-Addressable Blobs (SHA-1 & zlib)",
      status: "open",
      mastery: "seen",
      position: { x: 180, y: 0 * 175 },
      context: {
        goal: "Understand how Git hashes raw file bytes with a 'blob <size>\\0' header using SHA-1 and compresses them with zlib into .git/objects.",
        practice_task:
          "Write a Python function using hashlib.sha1 and zlib.compress to compute a Git blob hash for b'hello world\\n'.",
        explain_prompt:
          "Explain why Git prepends 'blob <length>\\0' before hashing and why identical files anywhere in a repo share a single object.",
        verification_criteria: [
          "Constructs 'blob <size>\\0' header",
          "Hashes with hashlib.sha1 and compresses with zlib",
        ],
        parent_summary: "Entry point to building Git internals from scratch in Python.",
        known: ["Cryptographic hashes", "Filesystem paths"],
        misconception: null,
        open_questions: ["Why does Git split the 40-char SHA-1 into a 2-char directory and 38-char filename?"],
      },
      user_submission: { hypothesis: "", stuck_at: "", code_or_output: "" },
      merge_note_md: `---\nid: n1\nparent: null\ntitle: "Content-Addressable Blobs (SHA-1 & zlib)"\nmastery: seen\n---\n# n1: Content-Addressable Blobs\n`,
    },
    {
      id: "n2",
      parent: null,
      title: "Tree Objects & Directory Hierarchies",
      status: "locked",
      mastery: "seen",
      position: { x: 180, y: 1 * 175 },
      context: {
        goal: "Understand how Git stores filenames, permissions (100644), and pointers to blobs/subtrees inside a 'tree' object.",
        practice_task:
          "Format a tree entry '<mode> <filename>\\0<20-byte-raw-sha>' and explain why blobs themselves don't store filenames.",
        explain_prompt:
          "Explain how tree objects map human-readable directory structures onto content-addressed blobs.",
        verification_criteria: [
          "Formats mode + filename + null byte + 20-byte binary SHA",
          "Explains separation of filename from blob content",
        ],
        parent_summary: "Blobs (n1) store raw file contents without names; trees (n2) give them names and directories.",
        known: ["Git blob hashing & zlib (n1)"],
        misconception: null,
        open_questions: ["Why does a tree object store the 20-byte binary digest instead of 40 hex chars?"],
      },
      user_submission: { hypothesis: "", stuck_at: "", code_or_output: "" },
      merge_note_md: `---\nid: n2\nparent: null\ntitle: "Tree Objects & Directory Hierarchies"\nmastery: seen\n---\n# n2: Tree Objects\n`,
    },
    {
      id: "n3",
      parent: null,
      title: "Commit Snapshots & Parent Pointers",
      status: "locked",
      mastery: "seen",
      position: { x: 180, y: 2 * 175 },
      context: {
        goal: "Create an immutable commit object pointing to a root tree SHA, optional parent commit SHA(s), author timestamp, and commit message.",
        practice_task:
          "Write a Python snippet that formats a 'commit <size>\\0tree <sha>\\nparent <sha>...' payload and hashes it.",
        explain_prompt:
          "Explain why Git commits are full tree snapshots rather than per-file diffs.",
        verification_criteria: [
          "Includes tree SHA and parent SHA in commit payload",
          "Explains DAG snapshot model vs delta diffs",
        ],
        parent_summary: "Commits (n3) chain root trees (n2) into a chronological Directed Acyclic Graph.",
        known: ["Blobs (n1)", "Trees (n2)"],
        misconception: null,
        open_questions: ["Why does changing a single commit message rewrite every descendant commit SHA?"],
      },
      user_submission: { hypothesis: "", stuck_at: "", code_or_output: "" },
      merge_note_md: `---\nid: n3\nparent: null\ntitle: "Commit Snapshots & Parent Pointers"\nmastery: seen\n---\n# n3: Commit Snapshots\n`,
    },
    {
      id: "n4",
      parent: null,
      title: "Refs, Branches & Symbolic HEAD",
      status: "locked",
      mastery: "seen",
      position: { x: 180, y: 3 * 175 },
      context: {
        goal: "Understand that a Git branch is simply a 41-byte text file in .git/refs/heads/ containing a commit SHA, and HEAD is a symbolic pointer.",
        practice_task:
          "Write a script that reads .git/HEAD, resolves 'ref: refs/heads/main', and updates the branch file to a new commit SHA.",
        explain_prompt:
          "Explain what 'detached HEAD' means in terms of the exact contents of the .git/HEAD file.",
        verification_criteria: [
          "Resolves symbolic ref in .git/HEAD",
          "Writes 40-char commit SHA to refs/heads/<branch>",
        ],
        parent_summary: "Human-friendly branch names (n4) are mutable pointers into our immutable commit DAG (n3).",
        known: ["Blobs (n1)", "Trees (n2)", "Commits (n3)"],
        misconception: null,
        open_questions: ["Why is creating a branch in Git instantaneous compared to copying folders?"],
      },
      user_submission: { hypothesis: "", stuck_at: "", code_or_output: "" },
      merge_note_md: `---\nid: n4\nparent: null\ntitle: "Refs, Branches & Symbolic HEAD"\nmastery: seen\n---\n# n4: Refs & Symbolic HEAD\n`,
    },
    {
      id: "n5",
      parent: null,
      title: "Three-Way Merge & Fast-Forward Resolution",
      status: "locked",
      mastery: "seen",
      position: { x: 180, y: 4 * 175 },
      context: {
        goal: "Find the Lowest Common Ancestor (merge base) of two branch tips in the commit DAG and perform a 3-way tree merge.",
        practice_task:
          "Write a BFS traversal over parent commit pointers to find the common ancestor SHA of two diverging branches.",
        explain_prompt:
          "Explain why a 2-way diff between branch A and branch B cannot tell which side deleted vs added a line without the common ancestor.",
        verification_criteria: [
          "Traverses commit parent pointers to find merge base",
          "Explains 3-way merge (Base, Ours, Theirs)",
        ],
        parent_summary: "Combines commit DAG traversal (n3) and ref updates (n4) to merge diverging histories.",
        known: ["Blobs (n1)", "Trees (n2)", "Commits (n3)", "Refs/HEAD (n4)"],
        misconception: null,
        open_questions: ["When can Git do a fast-forward merge without creating a merge commit?"],
      },
      user_submission: { hypothesis: "", stuck_at: "", code_or_output: "" },
      merge_note_md: `---\nid: n5\nparent: null\ntitle: "Three-Way Merge & Fast-Forward Resolution"\nmastery: seen\n---\n# n5: Three-Way Merge\n`,
    },
  ],
};

function getDesiredNodeCount(topic: string, preSurvey?: PreSurveyData): number {
  if (preSurvey?.preferredDepth === "short") return 3;
  if (preSurvey?.preferredDepth === "deep") return 7;

  // Dynamic node count based on task complexity
  const words = topic.trim().split(/\s+/).length;
  const lower = topic.toLowerCase();
  if (
    lower.startsWith("how do i ") ||
    lower.startsWith("what is ") ||
    words <= 3
  ) {
    return 4;
  }
  if (
    lower.includes("architecture") ||
    lower.includes("engine") ||
    lower.includes("compiler") ||
    lower.includes("distributed") ||
    lower.includes("from scratch") ||
    words >= 7
  ) {
    return 6;
  }
  return 4;
}

function buildCustomTopicFallback(
  topic: string,
  preSurvey?: PreSurveyData
): AppState {
  const cleanTopic = topic.trim() || "POSIX Tiny Shell in Python";
  const lower = cleanTopic.toLowerCase();
  const desiredCount = getDesiredNodeCount(cleanTopic, preSurvey);

  // If the user asks about git commit / git workflow, use the rich Git curriculum dynamically sized
  if (lower.includes("git")) {
    const gitPool: CurriculumNode[] = [
      {
        id: "n1",
        parent: null,
        title: `Working Folder vs. Staging Area`,
        status: "open",
        mastery: "seen",
        position: { x: 180, y: 0 * 175 },
        context: {
          goal: "Understand the difference between editing files in your folder, staging them with `git add`, and saving a snapshot with `git commit`.",
          practice_task:
            "Explain in plain words why `git commit` won't save a modified file unless you run `git add` first.",
          explain_prompt:
            "Explain why Git has a staging step before committing.",
          verification_criteria: [
            "Explains the Staging Area (git add) vs saving a Commit (git commit)",
            "Gives a simple example or explanation in plain words",
          ],
          parent_summary: `Starting point for learning "${cleanTopic}".`,
          known: ["Basic files and folders"],
          misconception: null,
          open_questions: [
            "Why is it helpful to stage only specific files instead of every file you touched?",
          ],
        },
        user_submission: { hypothesis: "", stuck_at: "", code_or_output: "" },
        merge_note_md: `---\nid: n1\nparent: null\ntitle: "Working Folder vs. Staging Area"\nmastery: seen\n---\n# n1: Working Folder vs. Staging Area\n`,
      },
      ...CURATED_TOPICS["git-internals"].slice(1),
    ];

    const selectedGitNodes = gitPool
      .slice(0, Math.min(gitPool.length, Math.max(3, desiredCount)))
      .map((n, idx) => ({
        ...n,
        id: `n${idx + 1}`,
        position: { x: 180, y: idx * 175 },
      }));

    return applyPreSurveyCalibration(
      {
        current_node_id: "n1",
        failed_attempts: 0,
        mastered_topics: [],
        nodes: selectedGitNodes,
        edges: buildSequentialEdges(selectedGitNodes),
      },
      preSurvey,
      cleanTopic
    );
  }

  const allStepTemplates = [
    {
      title: `The Big Picture: ${cleanTopic}`,
      goal: `Understand what "${cleanTopic}" is in plain language, what problem it solves, and why it matters.`,
      practice_task: `Explain the main idea of "${cleanTopic}" in 2-3 simple sentences, as if explaining it to a friend over coffee.`,
      criteria: [
        `Explains what ${cleanTopic} does in everyday language`,
        `Gives a simple real-world comparison or example`,
      ],
      question: `If you had to explain "${cleanTopic}" without using technical buzzwords, how would you describe it?`,
    },
    {
      title: `Core Building Blocks`,
      goal: `Identify the 2 or 3 essential parts that make "${cleanTopic}" work.`,
      practice_task: `List the key parts or inputs of "${cleanTopic}" and briefly describe what each part is responsible for.`,
      criteria: [
        `Names the key parts of ${cleanTopic}`,
        `Explains how those parts connect`,
      ],
      question: `Which part of "${cleanTopic}" is the most important, and what happens if it's missing?`,
    },
    {
      title: `How It Works Step-by-Step`,
      goal: `Walk through "${cleanTopic}" from start to finish so there's no "black box" mystery left.`,
      practice_task: `Trace one simple example of "${cleanTopic}" from start to finish—what happens first, second, and last?`,
      criteria: [
        `Walks through the step-by-step flow clearly`,
        `Connects the input to the final result`,
      ],
      question: `What is the easiest step to misunderstand when walking through "${cleanTopic}"?`,
    },
    {
      title: `Common Mistakes & Edge Cases`,
      goal: `Spot the most common misunderstandings or tricky situations people run into with "${cleanTopic}".`,
      practice_task: `Describe one common mistake beginners make with "${cleanTopic}" and how to avoid it.`,
      criteria: [
        `Identifies a realistic mistake or edge case in ${cleanTopic}`,
        `Explains how to handle or prevent it`,
      ],
      question: `What happens when "${cleanTopic}" is given an unexpected input or used in the wrong situation?`,
    },
    {
      title: `Real-World Application`,
      goal: `See how "${cleanTopic}" is used in practice to solve real problems.`,
      practice_task: `Describe a practical scenario where you would use "${cleanTopic}" and why it's the right tool for the job.`,
      criteria: [
        `Connects ${cleanTopic} to a practical real-world use case`,
        `Explains why it works well in that scenario`,
      ],
      question: `When would you choose "${cleanTopic}" over an alternative approach?`,
    },
    {
      title: `Trade-offs & Limitations`,
      goal: `Understand the pros, cons, and trade-offs of "${cleanTopic}" so you can make smart decisions.`,
      practice_task: `Compare the biggest strength of "${cleanTopic}" against its biggest limitation or cost.`,
      criteria: [
        `Identifies at least one trade-off or limitation`,
        `Explains when that trade-off matters`,
      ],
      question: `What is the main trade-off you accept when using "${cleanTopic}"?`,
    },
    {
      title: `Putting It All Together: ${cleanTopic}`,
      goal: `Combine everything you've learned about "${cleanTopic}" into a clear, lasting takeaway.`,
      practice_task: `Write a short summary checklist or key takeaway for "${cleanTopic}" that future-you can review in 30 seconds.`,
      criteria: [
        `Summarizes the complete mental model of ${cleanTopic}`,
        `Shows clear, independent understanding`,
      ],
      question: `How does "${cleanTopic}" connect to what you want to learn next?`,
    },
  ];

  // Dynamically pick 3 to 7 templates based on desiredCount
  const selectedTemplates =
    desiredCount <= 3
      ? [allStepTemplates[0], allStepTemplates[2], allStepTemplates[6]]
      : desiredCount === 4
      ? [
          allStepTemplates[0],
          allStepTemplates[1],
          allStepTemplates[2],
          allStepTemplates[6],
        ]
      : desiredCount === 5
      ? [
          allStepTemplates[0],
          allStepTemplates[1],
          allStepTemplates[2],
          allStepTemplates[3],
          allStepTemplates[6],
        ]
      : desiredCount === 6
      ? [
          allStepTemplates[0],
          allStepTemplates[1],
          allStepTemplates[2],
          allStepTemplates[3],
          allStepTemplates[4],
          allStepTemplates[6],
        ]
      : allStepTemplates;

  const nodes: CurriculumNode[] = selectedTemplates.map((tpl, idx) => {
    const id = `n${idx + 1}`;
    return {
      id,
      parent: null,
      title: tpl.title,
      status: idx === 0 ? "open" : "locked",
      mastery: "seen",
      position: { x: 180, y: idx * 175 },
      context: {
        goal: tpl.goal,
        practice_task: tpl.practice_task,
        explain_prompt: `Explain ${tpl.title} in your own words.`,
        verification_criteria: tpl.criteria,
        parent_summary:
          idx === 0
            ? `Step 1 of your learning path for "${cleanTopic}".`
            : `Builds on Step ${idx} to deepen your understanding of "${cleanTopic}".`,
        known: idx === 0 ? ["Everyday intuition"] : [`Completed n${idx}`],
        misconception: null,
        open_questions: [tpl.question],
      },
      user_submission: { hypothesis: "", stuck_at: "", code_or_output: "" },
      merge_note_md: `---
id: ${id}
parent: null
title: "${tpl.title.replace(/"/g, '\\"')}"
mastery: seen
tags: [learning-notes, ${id}]
---

# ${id}: ${tpl.title}

## Key Idea (${cleanTopic})
Notes on **${tpl.title}**.
`,
    };
  });

  return applyPreSurveyCalibration(
    {
      current_node_id: "n1",
      failed_attempts: 0,
      mastered_topics: [],
      nodes,
      edges: buildSequentialEdges(nodes),
    },
    preSurvey,
    cleanTopic
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "generate";
    const topicRaw = typeof body.topic === "string" ? body.topic.trim() : "";
    const presetKey = typeof body.presetKey === "string" ? body.presetKey : "";
    const preSurvey: PreSurveyData | undefined = body.preSurvey;
    const fileContext: string =
      typeof body.fileContext === "string" ? body.fileContext.trim() : "";

    const apiKey = (
      process.env.AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ""
    ).trim();

    // Dynamic Prerequisite Discovery for ANY topic
    if (action === "prereqs") {
      const targetTopic =
        topicRaw ||
        (presetKey === "posix-shell"
          ? "How a Command Shell Works"
          : presetKey === "git-internals"
          ? "How Git Saves Your Code"
          : presetKey === "tcp-http"
          ? "How Web Servers Talk to Browsers"
          : "General Topic");

      if (apiKey) {
        const geminiModels = [
          "gemini-3.5-flash-lite",
          "gemini-flash-lite-latest",
          "gemini-3.5-flash",
        ];
        for (const modelName of geminiModels) {
          try {
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [
                    {
                      role: "user",
                      parts: [
                        {
                          text: `List 4 short, plain-English prerequisite or foundational concepts (2-5 words each) that someone learning "${targetTopic}" might already know. Respond ONLY with JSON: { "prerequisites": ["...", "...", "...", "..."] }`,
                        },
                      ],
                    },
                  ],
                  generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.2,
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
              const match = rawText.match(/\{[\s\S]*\}/);
              if (match) {
                const parsed = JSON.parse(match[0]);
                if (
                  Array.isArray(parsed.prerequisites) &&
                  parsed.prerequisites.length >= 2
                ) {
                  return NextResponse.json({
                    prerequisites: parsed.prerequisites
                      .map(String)
                      .slice(0, 4),
                    source: "live_ai",
                  });
                }
              }
            }
          } catch {
            // Fall through to next model or fallback
          }
        }
      }

      return NextResponse.json({
        prerequisites: buildFallbackPrerequisites(targetTopic),
        source: "fallback",
      });
    }

    if (presetKey === "posix-shell") {
      const calibrated = applyPreSurveyCalibration(
        INITIAL_APP_STATE,
        preSurvey,
        "How a Command Shell Works"
      );
      return NextResponse.json({
        state: calibrated,
        ai_meta: {
          source: "live_ai",
          model_used: "Curated POSIX Tiny Shell Path",
          warning_message: null,
        },
      });
    }

    if (presetKey && CURATED_TOPICS[presetKey]) {
      const baseNodes = CURATED_TOPICS[presetKey];
      const sizedNodes =
        preSurvey?.preferredDepth === "short"
          ? baseNodes.slice(0, 3)
          : baseNodes;
      const state = applyPreSurveyCalibration(
        {
          current_node_id: "n1",
          failed_attempts: 0,
          mastered_topics: [],
          nodes: sizedNodes,
          edges: buildSequentialEdges(sizedNodes),
        },
        preSurvey,
        presetKey === "tcp-http"
          ? "How Web Servers Talk to Browsers"
          : "How Git Saves Your Code"
      );
      return NextResponse.json({
        state,
        ai_meta: {
          source: "live_ai",
          model_used: `Curated ${presetKey} Path`,
          warning_message: null,
        },
      });
    }

    if (!apiKey) {
      return NextResponse.json({
        state: buildCustomTopicFallback(topicRaw, preSurvey),
        ai_meta: {
          source: "no_api_key",
          model_used: "Built-In Curriculum Generator",
          warning_message:
            "No API key configured — generated dynamic learning path locally.",
        },
      });
    }

    const targetCountHint =
      preSurvey?.preferredDepth === "short"
        ? "3 or 4 nodes (concise, focused path)"
        : preSurvey?.preferredDepth === "deep"
        ? "6 or 7 nodes (comprehensive deep dive)"
        : "between 3 and 7 nodes dynamically chosen based on how simple or complex the topic actually is (do NOT default to 5 if 3, 4, 6, or 7 fits better)";

    const levelHint = preSurvey
      ? `Learner Level: ${preSurvey.experienceLevel}. Known Prerequisites: ${
          preSurvey.knownPrerequisites.join(", ") || "None specified"
        }. Adjust task difficulty and explanations to match this level.`
      : "Learner Level: approachable, clear, and jargon-free.";

    const systemPrompt = `You are a Friendly, Approachable Learning Path Designer.
Given ANY user topic (and optional study file context), generate a dynamic sequential learning path in valid JSON.
RULES:
1. Dynamic Node Count: Generate ${targetCountHint}. Number them sequentially "n1", "n2", ..., "nK".
2. Approachable Tone: Use warm, clear, everyday language. Avoid dense academic jargon.
3. Domain Adaptive: Match the subject naturally. Never force Python or POSIX unless the topic is specifically about them.
4. ${levelHint}

Each node must have:
- id: "n1", "n2", ...
- title: clear, friendly 3-6 word title
- goal: 1-2 sentence approachable learning goal
- practice_task: simple, concrete prompt asking the learner to explain or give an example in their own words
- verification_criteria: array of 2 short, plain-English criteria strings
- open_question: 1 thought-provoking question

Respond ONLY with valid JSON: { "nodes": [ { "id": "n1", "title": "...", "goal": "...", "practice_task": "...", "verification_criteria": ["..."], "open_question": "..." }, ... ] }`;

    let quotaExhausted = false;
    let quotaError = "";
    let modelUsed = "gemini-3.5-flash-lite";

    const geminiModels = [
      "gemini-3.5-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-2.5-flash",
    ];
    for (const modelName of geminiModels) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `Create a dynamic learning path for: "${topicRaw}".${
                        fileContext
                          ? `\nContext from user's kept study file:\n${fileContext.slice(
                              0,
                              1500
                            )}`
                          : ""
                      }`,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.3,
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
            if (
              Array.isArray(parsed.nodes) &&
              parsed.nodes.length >= 2 &&
              parsed.nodes.length <= 10
            ) {
              const builtNodes: CurriculumNode[] = parsed.nodes.map(
                (item: Record<string, unknown>, idx: number) => {
                  const id = `n${idx + 1}`;
                  const title = String(item.title || `Step ${idx + 1}`);
                  const goal = String(item.goal || "");
                  const practice_task = String(item.practice_task || "");
                  const criteria = Array.isArray(item.verification_criteria)
                    ? item.verification_criteria.map(String)
                    : [
                        "Explains the main idea in plain words",
                        "Gives a concrete example",
                      ];
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
                      explain_prompt: `Explain ${title} in your own words.`,
                      verification_criteria: criteria,
                      parent_summary:
                        idx === 0
                          ? `Starting step for ${topicRaw}`
                          : `Builds on Step ${idx} in ${topicRaw}`,
                      known: idx === 0 ? ["Basics"] : [`Completed n${idx}`],
                      misconception: null,
                      open_questions: [
                        String(
                          item.open_question ||
                            `Why does ${title} work this way?`
                        ),
                      ],
                    },
                    user_submission: {
                      hypothesis: "",
                      stuck_at: "",
                      code_or_output: "",
                    },
                    merge_note_md: `---\nid: ${id}\nparent: null\ntitle: "${title.replace(/"/g, '\\"')}"\nmastery: seen\n---\n\n# ${id}: ${title}\n\n## Goal\n${goal}\n`,
                  };
                }
              );

              const calibrated = applyPreSurveyCalibration(
                {
                  current_node_id: "n1",
                  failed_attempts: 0,
                  mastered_topics: [],
                  nodes: builtNodes,
                  edges: buildSequentialEdges(builtNodes),
                },
                preSurvey,
                topicRaw
              );

              const validated = AppStateSchema.safeParse(calibrated);
              if (validated.success) {
                modelUsed = modelName;
                return NextResponse.json({
                  state: validated.data,
                  ai_meta: {
                    source: "live_ai",
                    model_used: modelUsed,
                    warning_message: null,
                  },
                });
              }
            }
          }
        } else if (res.status === 429 || res.status === 503) {
          quotaExhausted = true;
          const errJson = await res.json().catch(() => ({}));
          quotaError =
            errJson?.error?.message || `HTTP ${res.status} on ${modelName}`;
        }
      } catch (e) {
        quotaError = e instanceof Error ? e.message : "Network error";
      }
    }

    return NextResponse.json({
      state: buildCustomTopicFallback(topicRaw, preSurvey),
      ai_meta: {
        source: quotaExhausted ? "quota_exhausted" : "error_fallback",
        model_used: "Built-In Curriculum Generator",
        warning_message: quotaExhausted
          ? `AI quota reached (${quotaError}) — generated your custom learning path using the built-in backup generator.`
          : `Live AI unreachable (${quotaError}) — generated your learning path using the built-in backup generator.`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to generate curriculum",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

