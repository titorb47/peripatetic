import { NextRequest, NextResponse } from "next/server";
import { AppState, AppStateSchema, CurriculumNode } from "@/types/schema";
import { INITIAL_APP_STATE, INITIAL_EDGES } from "@/data/seedNodes";

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

function buildCustomTopicFallback(topic: string): AppState {
  const cleanTopic = topic.trim() || "POSIX Tiny Shell in Python";
  const lower = cleanTopic.toLowerCase();

  // If the user asks about git commit / git workflow, use the rich Git curriculum
  if (lower.includes("git")) {
    return {
      current_node_id: "n1",
      failed_attempts: 0,
      mastered_topics: [],
      nodes: [
        {
          id: "n1",
          parent: null,
          title: `Working Tree vs. Staging Index (${cleanTopic})`,
          status: "open",
          mastery: "seen",
          position: { x: 180, y: 0 * 175 },
          context: {
            goal: "Understand the three areas of Git (Working Directory, Staging Index `.git/index`, and `.git/objects` Repository) and why `git add` stages content before `git commit`.",
            practice_task:
              'Write the shell commands (or Python subprocess calls) to stage a modified file with `git add` and create a snapshot with `git commit -m "message"`, and explain what `.git/index` holds.',
            explain_prompt:
              "Explain why `git commit` does nothing if you modify a file without running `git add` first.",
            verification_criteria: [
              "Explains the Staging Index (git add) vs Repository Commit (git commit)",
              "Includes a concrete git add / git commit command or Python snippet",
            ],
            parent_summary: `Entry point for mastering "${cleanTopic}" from first principles.`,
            known: ["Files and directories"],
            misconception: null,
            open_questions: [
              "Why does Git have a separate Staging Area instead of committing modified files directly?",
            ],
          },
          user_submission: { hypothesis: "", stuck_at: "", code_or_output: "" },
          merge_note_md: `---\nid: n1\nparent: null\ntitle: "Working Tree vs. Staging Index"\nmastery: seen\n---\n# n1: Working Tree vs. Staging Index\n`,
        },
        ...CURATED_TOPICS["git-internals"].slice(1),
      ],
      edges: INITIAL_EDGES,
    };
  }

  const stepTemplates = [
    {
      title: `Core Intuition & Mental Model: ${cleanTopic}`,
      goal: `Build a clear, jargon-free first-principles mental model of "${cleanTopic}"—what problem it solves, why it exists, and how its core pieces fit together.`,
      practice_task: `Write a concrete example, step-by-step walkthrough, formula, or snippet that illustrates the core concept of "${cleanTopic}" in action.`,
      criteria: [
        `Explains the core intuition of ${cleanTopic} in plain, first-principles language`,
        `Provides a concrete example, walkthrough, or snippet`,
      ],
      question: `If you had to explain "${cleanTopic}" to a smart 12-year-old using a real-world analogy, how would you describe it?`,
    },
    {
      title: `Fundamental Building Blocks & Rules`,
      goal: `Identify the essential building blocks, inputs/outputs, or rules that govern "${cleanTopic}".`,
      practice_task: `Break down a small, specific case of "${cleanTopic}" into its individual components or steps and trace how each part behaves.`,
      criteria: [
        `Identifies the key components or rules of ${cleanTopic}`,
        `Traces a concrete example step-by-step`,
      ],
      question: `Which single rule or building block in "${cleanTopic}" causes the entire system to fail if removed?`,
    },
    {
      title: `Step-by-Step Mechanism & Cause-and-Effect`,
      goal: `Trace the exact cause-and-effect sequence of "${cleanTopic}" from start to finish without skipping intermediate steps.`,
      practice_task: `Walk through a complete scenario or implementation of "${cleanTopic}" from initial state to final outcome, showing each transition.`,
      criteria: [
        `Explains the step-by-step cause-and-effect flow`,
        `Demonstrates an end-to-end transition or worked example`,
      ],
      question: `What is the most common misconception beginners have about what happens in the middle of "${cleanTopic}"?`,
    },
    {
      title: `Edge Cases, Pitfalls & Failure Modes`,
      goal: `Understand where "${cleanTopic}" breaks down, common mistakes people make, and how to handle edge cases cleanly.`,
      practice_task: `Describe or write a tricky edge case or common pitfall in "${cleanTopic}", and show how to diagnose and fix it.`,
      criteria: [
        `Identifies a realistic edge case or pitfall in ${cleanTopic}`,
        `Shows how to resolve or guard against that failure mode`,
      ],
      question: `What happens in "${cleanTopic}" when an input or assumption is unexpected or at its extreme limit?`,
    },
    {
      title: `Synthesis & Real-World Mastery: ${cleanTopic}`,
      goal: `Synthesize all pieces of "${cleanTopic}" to solve a realistic problem independently and teach it clearly.`,
      practice_task: `Create a complete, self-contained summary example, solution, or mental checklist for applying "${cleanTopic}" in the real world.`,
      criteria: [
        `Synthesizes the full mental model of ${cleanTopic}`,
        `Provides a complete worked application or synthesis example`,
      ],
      question: `How does "${cleanTopic}" connect to more advanced concepts or real-world applications in this field?`,
    },
  ];

  const nodes: CurriculumNode[] = stepTemplates.map((tpl, idx) => {
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
        explain_prompt: `Explain ${tpl.title} in your own words using the Feynman technique.`,
        verification_criteria: tpl.criteria,
        parent_summary:
          idx === 0
            ? `Entry point of your custom Feynman DAG curriculum for "${cleanTopic}".`
            : `Builds upon n${idx} to deepen your mastery of "${cleanTopic}".`,
        known: idx === 0 ? ["First-principles reasoning"] : [`Completed n${idx}`],
        misconception: null,
        open_questions: [tpl.question],
      },
      user_submission: { hypothesis: "", stuck_at: "", code_or_output: "" },
      merge_note_md: `---
id: ${id}
parent: null
title: "${tpl.title.replace(/"/g, '\\"')}"
mastery: seen
tags: [feynman-dag, custom-curriculum, ${id}]
---

# ${id}: ${tpl.title}

## Core Concept (${cleanTopic})
First-principles Feynman notes on **${tpl.title}**.
`,
    };
  });

  return {
    current_node_id: "n1",
    failed_attempts: 0,
    mastered_topics: [],
    nodes,
    edges: INITIAL_EDGES,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const topicRaw = typeof body.topic === "string" ? body.topic.trim() : "";
    const presetKey = typeof body.presetKey === "string" ? body.presetKey : "";

    if (presetKey === "posix-shell") {
      return NextResponse.json({
        state: INITIAL_APP_STATE,
        ai_meta: {
          source: "live_ai",
          model_used: "Curated POSIX Tiny Shell DAG",
          warning_message: null,
        },
      });
    }

    if (presetKey && CURATED_TOPICS[presetKey]) {
      const state: AppState = {
        current_node_id: "n1",
        failed_attempts: 0,
        mastered_topics: [],
        nodes: CURATED_TOPICS[presetKey],
        edges: INITIAL_EDGES,
      };
      return NextResponse.json({
        state,
        ai_meta: {
          source: "live_ai",
          model_used: `Curated ${presetKey} DAG`,
          warning_message: null,
        },
      });
    }

    const apiKey = (
      process.env.AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ""
    ).trim();

    if (!apiKey) {
      return NextResponse.json({
        state: buildCustomTopicFallback(topicRaw),
        ai_meta: {
          source: "no_api_key",
          model_used: "Deterministic Curriculum Generator",
          warning_message:
            "No API key configured — generated deterministic 5-node DAG curriculum.",
        },
      });
    }

    const systemPrompt = `You are a Universal Curriculum Architect for a Feynman-Technique Learning Platform.
Given ANY user topic (whether it is programming, Git, math, physics, algorithms, machine learning, finance, biology, or systems engineering), generate a 5-node sequential learning curriculum (n1, n2, n3, n4, n5) in valid JSON.
IMPORTANT: Match the domain of the user's topic! Do NOT force Python or POSIX unless the topic is actually about Python or POSIX.
Each node must have:
- id: "n1" | "n2" | "n3" | "n4" | "n5"
- title: concise 3-6 word title tailored to the topic
- goal: 1-2 sentence first-principles learning goal
- practice_task: concrete hands-on exercise, worked example, command, formula, or thought experiment appropriate for the topic
- verification_criteria: array of 2-3 short checkable criteria strings
- open_question: 1 Socratic question

Respond ONLY with valid JSON: { "nodes": [ { "id": "n1", "title": "...", "goal": "...", "practice_task": "...", "verification_criteria": ["..."], "open_question": "..." }, ... ] }`;

    let quotaExhausted = false;
    let quotaError = "";
    let modelUsed = "gemini-3.5-flash";

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
                      text: `Generate a 5-node Feynman DAG curriculum for learning: "${topicRaw}"`,
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
            if (Array.isArray(parsed.nodes) && parsed.nodes.length === 5) {
              const builtNodes: CurriculumNode[] = parsed.nodes.map(
                (item: Record<string, unknown>, idx: number) => {
                  const id = `n${idx + 1}`;
                  const title = String(item.title || `Stage ${idx + 1}`);
                  const goal = String(item.goal || "");
                  const practice_task = String(item.practice_task || "");
                  const criteria = Array.isArray(item.verification_criteria)
                    ? item.verification_criteria.map(String)
                    : ["Explains concept clearly", "Provides working code snippet"];
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
                          ? `Entry node for ${topicRaw}`
                          : `Follows n${idx} in ${topicRaw}`,
                      known: idx === 0 ? ["Fundamentals"] : [`Mastered n${idx}`],
                      misconception: null,
                      open_questions: [
                        String(
                          item.open_question ||
                            `How does ${title} work under the hood?`
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

              const candidateState: AppState = {
                current_node_id: "n1",
                failed_attempts: 0,
                mastered_topics: [],
                nodes: builtNodes,
                edges: INITIAL_EDGES,
              };

              const validated = AppStateSchema.safeParse(candidateState);
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
      state: buildCustomTopicFallback(topicRaw),
      ai_meta: {
        source: quotaExhausted ? "quota_exhausted" : "error_fallback",
        model_used: "Deterministic Curriculum Generator",
        warning_message: quotaExhausted
          ? `⚠️ AI QUOTA / CREDITS EXHAUSTED (${quotaError}): Generated your custom 5-node DAG using the built-in Deterministic Curriculum Engine!`
          : `⚠️ Live AI unreachable (${quotaError}): Generated your 5-node DAG using the built-in Deterministic Engine.`,
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

