import { AppState, CurriculumNode } from "@/types/schema";

export const SEED_NODES: CurriculumNode[] = [
  {
    id: "n1",
    parent: null,
    title: "The REPL Loop & Parsing",
    status: "open",
    mastery: "seen",
    position: { x: 180, y: 0 * 175 },
    context: {
      goal: "Read raw stdin, strip trailing newlines, and split into command + argument tokens without crashing on EOFError (Ctrl+D).",
      practice_task:
        'Write a Python loop using input("tsh> ") and shlex.split() that prints the token list and exits cleanly on exit or EOFError.',
      explain_prompt:
        "Explain why shlex.split() is preferred over str.split() for shell arguments and how Ctrl+D signals EOF.",
      verification_criteria: [
        "Uses try/except EOFError",
        "Splits input into a list via shlex.split()",
        "Loops continuously and exits cleanly on exit or EOFError",
      ],
      parent_summary: "Entry point of the POSIX Tiny Shell.",
      known: ["Basic Python syntax", "Standard input/output streams"],
      misconception: null,
      open_questions: [
        "How does the terminal driver send EOF on Ctrl+D?",
        "How are quoted arguments preserved during tokenization?",
      ],
    },
    user_submission: {
      hypothesis: "",
      stuck_at: "",
      code_or_output: "",
    },
    merge_note_md: `---
id: n1
parent: null
title: "The REPL Loop & Parsing"
mastery: seen
tags: [posix-shell, repl, parsing, shlex]
---

# n1: The REPL Loop & Parsing

## Core Concept
A shell's outer loop is a **Read-Eval-Print Loop (REPL)** that reads a command line from standard input (\`fd 0\`), parses it into tokens with \`shlex.split()\`, and handles \`EOFError\` (\`Ctrl+D\`) gracefully without dumping a Python traceback.

## Connected Nodes
- Next: [[n2|n2: Process Cloning (os.fork)]]
`,
  },
  {
    id: "n2",
    parent: null,
    title: "Process Cloning (os.fork)",
    status: "locked",
    mastery: "seen",
    position: { x: 180, y: 1 * 175 },
    context: {
      goal: "Understand how os.fork() duplicates the current process memory space and returns 0 to the child and the child's PID to the parent.",
      practice_task:
        "Write a script that calls os.fork() and prints distinct messages from the parent (including child PID) and child (including its own PID via os.getpid()).",
      explain_prompt:
        "Explain why os.fork() is called once but returns twice, and what value each process receives.",
      verification_criteria: [
        "Calls os.fork()",
        "Branches on pid == 0",
        "Demonstrates separate execution paths for parent and child",
      ],
      parent_summary: "After n1 parses command tokens, the shell must create a child process so executing a command doesn't terminate the shell itself.",
      known: ["REPL loop & shlex tokenization (n1)"],
      misconception: null,
      open_questions: [
        "Why does fork() return 0 in the child instead of the child's PID?",
        "What gets duplicated across parent and child memory spaces?",
      ],
    },
    user_submission: {
      hypothesis: "",
      stuck_at: "",
      code_or_output: "",
    },
    merge_note_md: `---
id: n2
parent: null
title: "Process Cloning (os.fork)"
mastery: seen
tags: [posix-shell, fork, processes, syscalls]
---

# n2: Process Cloning (os.fork)

## Core Concept
\`os.fork()\` clones the calling process using Copy-On-Write (COW) memory pages. It returns \`0\` to the newly created child process and the child's Process ID (\`PID > 0\`) to the parent process.

## Connected Nodes
- Prerequisite: [[n1|n1: The REPL Loop & Parsing]]
- Next: [[n3|n3: Image Replacement (os.execvp)]]
`,
  },
  {
    id: "n3",
    parent: null,
    title: "Image Replacement (os.execvp)",
    status: "locked",
    mastery: "seen",
    position: { x: 180, y: 2 * 175 },
    context: {
      goal: "Understand how os.execvp() replaces the current process image with a new program while inheriting open file descriptors.",
      practice_task:
        "Inside the pid == 0 child branch, use os.execvp() to run ls -la and explain why a print() statement immediately after os.execvp() never executes unless exec fails.",
      explain_prompt:
        "Explain how os.execvp() transforms a forked child process into a new program while keeping open file descriptors intact.",
      verification_criteria: [
        "Calls os.execvp(args[0], args) inside child branch",
        "User explains process image replacement",
      ],
      parent_summary: "With n2 cloning the shell process via os.fork(), the child process now needs to replace its Python interpreter memory image with the target binary.",
      known: ["REPL loop & shlex tokenization (n1)", "Process cloning with os.fork() (n2)"],
      misconception: null,
      open_questions: [
        "Why does print() after os.execvp() never run on success?",
        "What happens to the process's open file descriptor table across execvp()?",
      ],
    },
    user_submission: {
      hypothesis: "",
      stuck_at: "",
      code_or_output: "",
    },
    merge_note_md: `---
id: n3
parent: null
title: "Image Replacement (os.execvp)"
mastery: seen
tags: [posix-shell, execvp, file-descriptors, process-image]
---

# n3: Image Replacement (os.execvp)

## Core Concept
\`os.execvp(file, args)\` overwrites the calling process's text, data, BSS, and stack segments with a new executable loaded from \`PATH\`, while preserving its PID and open file descriptor table.

## Connected Nodes
- Prerequisite: [[n2|n2: Process Cloning (os.fork)]]
- Next: [[n4|n4: Process Synchronization (os.waitpid)]]
`,
  },
  {
    id: "n4",
    parent: null,
    title: "Process Synchronization (os.waitpid)",
    status: "locked",
    mastery: "seen",
    position: { x: 180, y: 3 * 175 },
    context: {
      goal: "Prevent zombie processes and race conditions in the terminal prompt by making the parent wait for the child's exit status.",
      practice_task:
        "Use os.waitpid(pid, 0) in the parent branch and extract the exit status using os.WEXITSTATUS(status).",
      explain_prompt:
        "Explain what a zombie process is and why the parent shell must reap its child with os.waitpid() before printing the next prompt.",
      verification_criteria: [
        "Parent blocks until child finishes via os.waitpid(pid, 0)",
        "Extracts exit code using os.WEXITSTATUS(status)",
      ],
      parent_summary: "Once the child executes a program via os.execvp() in n3, the parent shell must wait for foreground completion and reap the child process entry.",
      known: ["REPL loop (n1)", "os.fork() (n2)", "os.execvp() image replacement (n3)"],
      misconception: null,
      open_questions: [
        "Why does the prompt interleave with command output if waitpid() is omitted?",
        "How does the kernel store exit status until waitpid() is called?",
      ],
    },
    user_submission: {
      hypothesis: "",
      stuck_at: "",
      code_or_output: "",
    },
    merge_note_md: `---
id: n4
parent: null
title: "Process Synchronization (os.waitpid)"
mastery: seen
tags: [posix-shell, waitpid, zombies, exit-status]
---

# n4: Process Synchronization (os.waitpid)

## Core Concept
Calling \`_, status = os.waitpid(pid, 0)\` suspends the parent shell until child \`pid\` changes state, reaps its kernel process table entry to prevent zombies, and allows decoding the exit status with \`os.WEXITSTATUS(status)\`.

## Connected Nodes
- Prerequisite: [[n3|n3: Image Replacement (os.execvp)]]
- Next: [[n5|n5: Inter-Process Communication (os.pipe & os.dup2)]]
`,
  },
  {
    id: "n5",
    parent: null,
    title: "Inter-Process Communication (os.pipe & os.dup2)",
    status: "locked",
    mastery: "seen",
    position: { x: 180, y: 4 * 175 },
    context: {
      goal: "Connect the stdout (fd 1) of one child process to the stdin (fd 0) of a second child process using kernel pipe buffers.",
      practice_task:
        "Use r, w = os.pipe() and os.dup2() across two forked children to execute ls | wc -l, ensuring unused pipe ends are closed in both parent and children so wc receives EOF.",
      explain_prompt:
        "Explain how os.dup2() rewires file descriptor table entries and why failing to close the write end of the pipe causes the reader process to hang forever.",
      verification_criteria: [
        "Creates pipe via r, w = os.pipe()",
        "Redirects fds 0 and 1 via os.dup2",
        "Closes unused fd ends in parent and children",
      ],
      parent_summary: "Combining fork (n2), execvp (n3), and waitpid (n4) with kernel pipes and descriptor duplication enables UNIX pipelines.",
      known: ["REPL (n1)", "os.fork (n2)", "os.execvp (n3)", "os.waitpid (n4)"],
      misconception: null,
      open_questions: [
        "Why does the reader process hang if the parent forgets to os.close(w)?",
        "How does os.dup2(w, 1) point stdout to the kernel pipe buffer?",
      ],
    },
    user_submission: {
      hypothesis: "",
      stuck_at: "",
      code_or_output: "",
    },
    merge_note_md: `---
id: n5
parent: null
title: "Inter-Process Communication (os.pipe & os.dup2)"
mastery: seen
tags: [posix-shell, pipe, dup2, ipc]
---

# n5: Inter-Process Communication (os.pipe & os.dup2)

## Core Concept
\`r, w = os.pipe()\` allocates a unidirectional kernel buffer. Using \`os.dup2(w, 1)\` in the left child and \`os.dup2(r, 0)\` in the right child connects \`stdout\` to \`stdin\`. All unused file descriptors must be closed so the reader sees \`EOF\` when the writer exits.

## Connected Nodes
- Prerequisite: [[n4|n4: Process Synchronization (os.waitpid)]]
`,
  },
];

export const INITIAL_EDGES = [
  { id: "e-n1-n2", source: "n1", target: "n2", animated: true },
  { id: "e-n2-n3", source: "n2", target: "n3", animated: false },
  { id: "e-n3-n4", source: "n3", target: "n4", animated: false },
  { id: "e-n4-n5", source: "n4", target: "n5", animated: false },
];

export const INITIAL_APP_STATE: AppState = {
  current_node_id: "n1",
  failed_attempts: 0,
  mastered_topics: [],
  nodes: SEED_NODES,
  edges: INITIAL_EDGES,
};

export function createLiveDemoSeedState(): AppState {
  const demoNodes: CurriculumNode[] = SEED_NODES.map((node) => {
    if (node.id === "n1") {
      return {
        ...node,
        status: "merged",
        mastery: "independent",
        user_submission: {
          hypothesis:
            "I think shlex.split tokenizes shell input while respecting quotes, and catching EOFError handles Ctrl+D cleanly.",
          stuck_at: "Handled edge cases for empty input lines.",
          code_or_output: `import shlex

while True:
    try:
        line = input("tsh> ")
    except EOFError:
        print()
        break
    tokens = shlex.split(line)
    if not tokens:
        continue
    if tokens[0] == "exit":
        break
    print(tokens)`,
        },
        merge_note_md: `---
id: n1
parent: null
title: "The REPL Loop & Parsing"
mastery: independent
tags: [posix-shell, repl, parsing, shlex]
---

# n1: The REPL Loop & Parsing

## Feynman Summary
The shell reads commands using an infinite REPL loop. \`shlex.split()\` parses quoted strings properly into an \`argv\` token list, while catching \`EOFError\` ensures pressing \`Ctrl+D\` exits the shell cleanly without a traceback.

## Verified Implementation
\`\`\`python
import shlex
while True:
    try:
        line = input("tsh> ")
    except EOFError:
        break
    tokens = shlex.split(line)
    if not tokens or tokens[0] == "exit":
        break
    print(tokens)
\`\`\`

## Connected Nodes
- Next: [[n2|n2: Process Cloning (os.fork)]]
`,
      };
    }

    if (node.id === "n2") {
      return {
        ...node,
        status: "merged",
        mastery: "independent",
        user_submission: {
          hypothesis:
            "I think os.fork() duplicates the current process in kernel memory and returns 0 to the child process and the child's PID to the parent process.",
          stuck_at: "Verified both PID branches print as expected.",
          code_or_output: `import os

pid = os.fork()
if pid == 0:
    print(f"[Child] My PID is {os.getpid()}")
else:
    print(f"[Parent] Spawned child with PID {pid}")`,
        },
        merge_note_md: `---
id: n2
parent: null
title: "Process Cloning (os.fork)"
mastery: independent
tags: [posix-shell, fork, processes, syscalls]
---

# n2: Process Cloning (os.fork)

## Feynman Summary
\`os.fork()\` clones the running process address space via copy-on-write. Because both processes resume right after the \`fork()\` syscall, checking \`if pid == 0:\` isolates child execution while the parent receives the child's positive PID.

## Verified Implementation
\`\`\`python
import os
pid = os.fork()
if pid == 0:
    print(f"Child PID: {os.getpid()}")
else:
    print(f"Parent spawned child PID: {pid}")
\`\`\`

## Connected Nodes
- Prerequisite: [[n1|n1: The REPL Loop & Parsing]]
- Next: [[n3|n3: Image Replacement (os.execvp)]]
`,
      };
    }

    if (node.id === "n3") {
      return {
        ...node,
        status: "open",
        mastery: "seen",
        user_submission: {
          hypothesis:
            "I think os.execvp runs a command in a sub-thread and then returns to my Python script, and file descriptors are just the files on disk.",
          stuck_at:
            "Why does my shell exit completely when I call execvp without fork, and what happens to open files across exec?",
          code_or_output: `import os

# Attempted inside my shell loop:
args = ["ls", "-la"]
os.execvp(args[0], args)
print("Done running ls! Back to prompt...") # Why does this line never print?!`,
        },
      };
    }

    return { ...node };
  });

  return {
    current_node_id: "n3",
    failed_attempts: 1,
    mastered_topics: ["n1", "n2"],
    nodes: demoNodes,
    edges: [
      { id: "e-n1-n2", source: "n1", target: "n2", animated: false },
      { id: "e-n2-n3", source: "n2", target: "n3", animated: true },
      { id: "e-n3-n4", source: "n3", target: "n4", animated: false },
      { id: "e-n4-n5", source: "n4", target: "n5", animated: false },
    ],
  };
}

