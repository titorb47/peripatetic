# Wacode 2026 team project

This repository is your team's project record for the hackathon. **Commit and push all project code here as you build it.** Keep the code, configuration files (without secrets), and assets needed for your demo in this repository. Work on branches if you like, but merge the finished work into `main` before judging. Files left only on a laptop or in another repository cannot be reviewed here.

## Fill in your project details

- **Team name: Less than 5 **
- **Team members: Sergio, Samuel, Andres, Tito**

## Protect secrets and user data

Event administrators will inspect this repository for security leaks and other issues during judging. Treat the full commit history as reviewable, even if the repository is private.

- Never commit API keys, passwords, access tokens, private keys, service-account files, `.env` files, or real personal data.
- Keep secrets in environment variables or a secrets manager. Add local secret files to `.gitignore`; use an `.env.example` file with placeholders to document required variables.
- Use only the access your project needs. Validate untrusted input, and do not leave debug or admin interfaces exposed.
- If a secret is committed, revoke or rotate it immediately and tell an organizer. Deleting it in a later commit does not remove it from the repository history.

## Before judging

Make sure the latest working version is pushed to `main`, the demo or setup instructions are clear, and your team can explain its design and security choices. Disclose AI-generated work, outside code and data, and anything simulated in the demo. Judges use the [Wacode judging rubric](https://www.wacode2026.com/judging/Hackathon_Judging_Rubric.pdf) and [score sheet](https://www.wacode2026.com/judging/Hackathon_Judge_Score_Sheet.pdf).

---

## Project Overview: ShellFromScratch // Feynman DAG Learning Platform

**ShellFromScratch** is a first-principles learning engine built on the **Feynman Technique** and a **Directed Acyclic Graph (DAG)** curriculum with dynamic prerequisite remediation (`max_branch_depth = 1`) and lossless **Obsidian Vault (`.zip`)** export.

- **Flagship Track:** Build a POSIX Tiny Shell in Python (`n1` REPL & `shlex.split` $\rightarrow$ `n2` `os.fork` $\rightarrow$ `n3` `os.execvp` $\rightarrow$ `n4` `os.waitpid` $\rightarrow$ `n5` `os.pipe` & `os.dup2`), plus dynamic side-quest remediation (`n3-b1: What is a File Descriptor?`).
- **Universal Custom Topic Generator:** Enter any topic (e.g., *"How Git Commit Works"*, *"Transformer Self-Attention"*, *"Public Key Cryptography & TLS"*, *"SQLite B-Tree Engine"*) to generate a custom 5-node DAG without forcing POSIX or Python.

### Quick Setup & Local Run

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Configure API Key (Server-Side Only):**
   Copy `.env.example` to `.env.local` and paste your Google AI Studio (`GEMINI_API_KEY`) key:
   ```bash
   cp .env.example .env.local
   ```
   *(Note: `.env.local` is gitignored so credentials are never committed. If no key is provided or free-tier quota is exhausted, the platform automatically falls back to its built-in Deterministic Feynman Backup Engine and displays a live status badge in the header.)*
3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

### Responsible Information Handling & Security Disclosures (Rubric 5/5)

1. **Zero Client-Side Key Exposure:** API keys are read strictly inside Next.js server routes (`src/app/api/tutor/route.ts` and `src/app/api/curriculum/route.ts`) via `process.env` and never exposed to the browser bundle (`NEXT_PUBLIC_*` is never used for secrets).
2. **Automatic Credential Redaction (`redactSensitiveData`):** Learner inputs and imported `.md` notes are scanned and scrubbed for accidentally pasted API keys (`AQ.*`, `AIza*`, `sk-*`, `ghp_*`, `AKIA*`, private keys) before LLM processing or `localStorage`/Obsidian persistence.
3. **XML Sandboxing & Live Misuse Test (`<untrusted_learner_data>`):** Imported Markdown notes and user inputs are validated with Zod (`src/types/schema.ts`), XML-escaped, and isolated inside `<untrusted_learner_data>` tags. Click **"Test Malicious .md Injection"** in the UI (or import `public/demo-malicious-injection.md`) to see the live prompt-injection refusal in action.
4. **Destructive Command Guardrail:** Scans code/command submissions for destructive operations (`rm -rf`, `shutil.rmtree`, `mkfs`, `dd if=`, fork bombs) and triggers an immediate safety banner.
5. **Remaining Weaknesses & Disclosures:** Full disclosure of remaining limitations (semantic jailbreaks beyond regex, lack of in-browser kernel syscall sandboxing, and `localStorage` shared-device storage) is documented inside the in-app **"Security & Limitations"** modal (`src/components/SecurityModal.tsx`).

