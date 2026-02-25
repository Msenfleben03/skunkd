# Claude Code Tools Research for SKUNK'D (Cribbage PWA)
## Date: 2026-02-25
## Tech Stack: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Supabase, PWA, LLM API (Gemini)

---

## TABLE OF CONTENTS

1. [Official & Core Plugins](#1-official--core-plugins)
2. [Supabase Integration](#2-supabase-integration)
3. [React / TypeScript Development](#3-react--typescript-development)
4. [Tailwind CSS / shadcn/ui](#4-tailwind-css--shadcnui)
5. [Testing (Vitest, Playwright, E2E)](#5-testing-vitest-playwright-e2e)
6. [PWA & Deployment](#6-pwa--deployment)
7. [LLM / Gemini Integration](#7-llm--gemini-integration)
8. [Image Generation (Card Art / Assets)](#8-image-generation-card-art--assets)
9. [Real-time / Multiplayer](#9-real-time--multiplayer)
10. [Game Development Specific](#10-game-development-specific)
11. [Frontend Design & UI Quality](#11-frontend-design--ui-quality)
12. [Development Workflow & Productivity](#12-development-workflow--productivity)
13. [Documentation & Context](#13-documentation--context)
14. [Meta-Resources (Curated Lists)](#14-meta-resources-curated-lists)
15. [Installation Quick Reference](#15-installation-quick-reference)

---

## 1. OFFICIAL & CORE PLUGINS

### Superpowers (obra/superpowers)
- **Source**: https://github.com/obra/superpowers
- **Plugin Page**: https://claude.com/plugins/superpowers
- **What it does**: Transforms Claude Code from a code generator into a structured development partner. Enforces a 7-phase workflow: Socratic brainstorming before coding, micro-task planning (2-5 minute tasks), test-driven development, subagent-driven development with built-in code review, and skill authoring. 42,000+ GitHub stars. Officially in the Anthropic marketplace (Jan 2026).
- **Why relevant**: For a complex game like SKUNK'D with multiplayer, auth, realtime, and game logic, structured development with TDD and planning prevents the chaos of ad-hoc coding. This is the single most impactful plugin for project quality.

### Ralph Loop (ralph-wiggum)
- **Source**: https://github.com/anthropics/claude-code/blob/main/plugins/ralph-wiggum/README.md
- **Plugin Page**: https://claude.com/plugins/ralph-loop
- **What it does**: Enables autonomous, long-running multi-task execution loops. Uses a Stop hook that intercepts Claude's exit; each iteration sees modified files and git history from previous runs. Supports configurable session expiration, rate limiting, and max-iterations safety nets.
- **Why relevant**: Ideal for batch operations like scaffolding all game components, writing comprehensive test suites, or building out the full Supabase schema. Set it up with a clear task list and let it run.

### Frontend Design (Official Anthropic Plugin)
- **Source**: https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md
- **Plugin Page**: https://claude.com/plugins/frontend-design
- **What it does**: Makes Claude pick an actual aesthetic direction before writing code instead of defaulting to generic Inter + purple gradient + rounded cards. Applies bold typography, unique color palettes, and creative layouts.
- **Why relevant**: SKUNK'D needs a distinctive game aesthetic -- skunk theme, card table feel, playful but polished. This plugin prevents bland UI defaults.

---

## 2. SUPABASE INTEGRATION

### Supabase MCP Server (Official)
- **Source**: https://smithery.ai/server/@supabase-community/supabase-mcp
- **Docs**: https://supabase.com/docs/guides/getting-started/mcp
- **What it does**: Connect Claude directly to your Supabase project. Manage tables, schemas, migrations, execute SQL queries, manage auth, storage, and realtime subscriptions. Supports DDL operations and raw SQL. Rating: 78/100 on Smithery.
- **Why relevant**: Direct database design and management for SKUNK'D -- player profiles, game state tables, match history, leaderboards, RLS policies for multiplayer security.

### Supabase Marketplace (rdimascio)
- **Source**: https://github.com/rdimascio/supabase-marketplace
- **What it does**: 10 production-ready Claude Code plugins:
  1. Advanced Authentication (OAuth, MFA, session management)
  2. Database Operations (queries, transactions, RLS policies)
  3. Storage Manager (file uploads, CDN, transformations)
  4. Realtime Sync (WebSocket subscriptions, presence, DB changes)
  5. Edge Functions (serverless Deno/TypeScript)
  6. RLS Security (Row Level Security patterns)
  7. Database Migrations (schema management)
  8. Client SDK (TypeScript/JavaScript patterns)
  9. Testing Tools (unit and integration testing)
  10. Performance Optimization (query optimization, caching)
- **Why relevant**: Covers nearly every Supabase capability SKUNK'D needs. The Realtime Sync plugin is critical for multiplayer game state. RLS Security is essential for preventing cheating. Auth handles player accounts.

### Supabase-Pack (@intentsolutionsio)
- **Source**: https://claudecodeplugins.io/plugins/supabase-pack/
- **NPM**: https://www.npmjs.com/package/@intentsolutionsio/supabase-pack
- **What it does**: 30 skills covering authentication, database, storage, realtime, edge functions, and production operations. Skills trigger automatically when you discuss Supabase topics (e.g., "Help me set up Supabase" triggers supabase-install-auth).
- **Why relevant**: Comprehensive skill pack that auto-activates contextually. Good companion to the MCP server for when you want Claude to follow best practices without explicit prompting.

### Supabase SDK Patterns Skill
- **Source**: https://claudecodeplugins.io/skills/supabase-sdk-patterns/
- **What it does**: Teaches Claude correct Supabase client SDK patterns for TypeScript, ensuring generated code uses proper typing, error handling, and SDK conventions.
- **Why relevant**: Prevents subtle SDK misuse in game logic, auth flows, and realtime subscriptions.

### Supabase Plugin (Official Anthropic)
- **Source**: https://claude.com/plugins/supabase
- **What it does**: Official Anthropic-managed Supabase integration providing 20+ tools for managing Supabase infrastructure including database operations, authentication, storage, and real-time subscriptions.
- **Why relevant**: First-party support with quality guarantees from Anthropic.

---

## 3. REACT / TYPESCRIPT DEVELOPMENT

### React Marketplace (rdimascio)
- **Source**: https://github.com/rdimascio/react-marketplace
- **What it does**: 10 production-ready plugins for React 18+:
  1. Component Development (generation, scaffolding, custom hooks, performance)
  2. State Management (Context API, Zustand, Jotai, Valtio, XState, Redux migration)
  3. TypeScript Integration (type generation, generics, strict safety)
  4. Testing Suite (unit, integration, E2E, coverage, mocks)
  5. Performance (bundle optimization, render profiling, code splitting, memory leaks)
  6. Accessibility (WCAG compliance, ARIA, keyboard nav, screen reader)
  7. Forms & Validation (multi-step, Yup/Zod schema validation)
  8. Data Fetching (API hooks, React Query/SWR, realtime subscriptions, GraphQL)
  9. Animation (component animations, page transitions, gestures, scroll effects)
  10. Error Handling (error boundaries, recovery, tracking, fallback UI)
- **Why relevant**: Covers the full React development surface for SKUNK'D. State Management (Zustand) for game state, Data Fetching for Supabase queries, Animation for card play effects, Forms for game settings/lobby.

### Vercel React Best Practices Skill
- **Source**: https://github.com/vercel-labs/agent-skills
- **Docs**: https://vercel.com/docs/agent-resources/skills
- **Article**: https://medium.com/@dan.avila7/vercel-just-dropped-the-react-bible-as-a-claude-code-skill-0c1cd905a1b4
- **What it does**: 57 rules across 8 categories for React/Next.js performance optimization, prioritized by impact. Covers bundle size, rendering, memoization, lazy loading, and more. Also available on aitmpl.com.
- **Why relevant**: Performance optimization for a PWA card game is critical -- smooth animations, fast load times, efficient re-renders during gameplay.

### JavaScript Testing Patterns Skill
- **Source**: https://claude-plugins.dev/skills/@wshobson/agents/javascript-testing-patterns
- **What it does**: Comprehensive testing strategies using Jest, Vitest, and Testing Library for unit tests, integration tests, and E2E testing with mocking, fixtures, and TDD/BDD workflows.
- **Why relevant**: Establishes testing patterns for game logic (scoring, pegging, hand evaluation), component testing, and integration testing.

### TypeScript & Rust LSP Plugin
- **Source**: Referenced in official plugin ecosystem
- **What it does**: Runs real type checks via LSP to surface type/lint errors inside the Claude workflow. Catches type errors before they become runtime bugs.
- **Why relevant**: TypeScript strictness matters for game state management where type safety prevents bugs in scoring, card dealing, and multiplayer state sync.

---

## 4. TAILWIND CSS / SHADCN/UI

### Tailwind CSS Marketplace (rdimascio)
- **Source**: https://github.com/rdimascio/tailwindcss-marketplace
- **What it does**: 10 production-ready plugins:
  1. Button Components (8 variants, 5 sizes, dark mode, WCAG)
  2. Form Controls (9 types, validation states, floating labels)
  3. Card Systems (8 varieties, 4 layouts, flip animations, expandable)
  4. Dark Mode Pro (4 themes, auto-detection, smooth transitions)
  5. Typography Extended (fluid scaling, type scales, variable fonts)
  6. Animation Suite (8 core animations, scroll-triggered, stagger, particles)
  7. Layout Patterns (7 layouts, grid systems, container queries)
  8. Design System Builder (tokens, component library, brand guidelines)
  9. Accessibility Utilities (screen reader, focus management, ARIA)
  10. Performance Optimizer (tree shaking, code splitting, critical CSS)
- **Why relevant**: Card Systems with flip animations is directly applicable to cribbage card play. Animation Suite for dealing/pegging effects. Dark Mode for night play. Design System Builder for consistent SKUNK'D branding.

### Shadcnblocks-Skill
- **Source**: https://github.com/masonjames/Shadcnblocks-Skill
- **What it does**: Gives Claude expert knowledge of 2,500+ shadcn/ui blocks and components. Claude intelligently selects, installs, and composes pre-built UI sections -- landing pages, dashboards, ecommerce flows. Describe what you want and it picks the right pieces.
- **Why relevant**: Rapid UI composition for game lobby, leaderboards, player profiles, settings screens, and onboarding flows using shadcn/ui components.

### Shadcn/ui MCP Server
- **Source**: https://www.shadcn.io/mcp/claude-code
- **What it does**: Connects Claude Code to React components with accurate TypeScript props and component documentation. Real-time access to the shadcn/ui component API.
- **Why relevant**: Ensures Claude generates correct shadcn/ui component usage with proper props, avoiding documentation drift.

### shadcn-components Skill
- **Source**: https://claude-plugins.dev/skills/@sgcarstrends/sgcarstrends/shadcn-components
- **What it does**: Specialized skill for working with shadcn/ui components within Claude Code, providing component patterns and best practices.
- **Why relevant**: Additional shadcn/ui expertise for building the game UI consistently.

---

## 5. TESTING (VITEST, PLAYWRIGHT, E2E)

### Vitest MCP Server (djankies/vitest-mcp)
- **Source**: https://github.com/djankies/vitest-mcp
- **NPM**: https://www.npmjs.com/package/@djankies/vitest-mcp
- **What it does**: AI-optimized Vitest runner with structured JSON output, intelligent test targeting, coverage analysis, log capturing, multi-repo support, and safety guards. Tools: set_project_root, list_tests, run_tests, analyze_coverage.
- **Why relevant**: Primary test runner for SKUNK'D unit tests. Coverage analysis identifies untested game logic (scoring algorithms, card evaluation, pegging rules). Safety guards prevent accidental full-suite runs during development.
- **Install**: `claude mcp add vitest npx -y @djankies/vitest-mcp`

### Playwright Skill (lackeyjb)
- **Source**: https://github.com/lackeyjb/playwright-skill
- **What it does**: Claude Code Skill for browser automation with Playwright. Model-invoked -- Claude autonomously writes and executes custom automation for testing and validation. Reads skill guides and generates code following exact patterns.
- **Why relevant**: E2E testing for game flows -- lobby creation, card dealing, scoring, multiplayer interactions, PWA install prompt.

### Playwright Autopilot (kaizen-yutani)
- **Source**: https://github.com/kaizen-yutani/playwright-autopilot
- **What it does**: Autonomous Playwright E2E test fixer. Runs tests with full action capture including DOM snapshots, network requests, console output, and screenshots. Debugs and fixes failing tests automatically.
- **Why relevant**: When E2E tests break during development, this plugin auto-diagnoses and fixes them rather than requiring manual debugging.

### Playwright MCP Server (Smithery)
- **Source**: https://smithery.ai/server/@Automata-Labs-team/mcp-server-playwright
- **What it does**: Enables Claude to interact with web pages, take screenshots, execute JavaScript in real browser environments, generate test code, and scrape web pages.
- **Why relevant**: Browser-level testing and validation of the PWA game interface, including mobile viewport testing.

### Vitest Testing Skill
- **Source**: https://playbooks.com/skills/secondsky/claude-skills/vitest-testing
- **What it does**: Accelerates JavaScript/TypeScript testing with Vitest patterns, providing fast unit and integration tests with robust mocking.
- **Why relevant**: Complements the Vitest MCP server with skill-based test patterns.

### Component Testing Skill
- **Source**: https://claude-plugins.dev/skills/@PrasadTelasula/EvokeQOne/component-testing
- **What it does**: Specialized skill for React component testing patterns.
- **Why relevant**: Testing game UI components -- card display, score board, game controls, lobby interface.

### E2E Test Framework Skill
- **Source**: https://playbooks.com/skills/jeremylongshore/claude-code-plugins-plus-skills/e2e-test-framework
- **What it does**: Framework for end-to-end testing with best practices and patterns.
- **Why relevant**: Structured approach to E2E testing the full game lifecycle.

---

## 6. PWA & DEPLOYMENT

### Vite PWA Plugin (vite-plugin-pwa)
- **Source**: https://vite-pwa-org.netlify.app/guide/register-service-worker
- **Docs**: https://deepwiki.com/vite-pwa/vite-plugin-pwa
- **What it does**: Zero-configuration Vite plugin that adds PWA capabilities. Auto-generates service worker, manifest, handles caching strategies, version management for offline updates. Transform any Vite app into offline-capable PWA in under 10 minutes.
- **Why relevant**: Core PWA infrastructure for SKUNK'D. Service worker handles offline cribbage games, asset caching, and app-like mobile experience.

### Vercel Deploy Skill
- **Source**: https://github.com/vercel/vercel-deploy-claude-code-plugin
- **Skill Page**: https://mcpservers.org/claude-skills/vercel/vercel-deploy
- **What it does**: Instant deployment from Claude Code conversations. Returns preview URL and claimable deployment link. No authentication required for previews. Supports React/Vite frameworks.
- **Why relevant**: Rapid deployment previews during development. Deploy SKUNK'D for testing on real mobile devices without manual deployment steps.

---

## 7. LLM / GEMINI INTEGRATION

### Claude-Gemini MCP Slim (cmdaltctr)
- **Source**: https://github.com/cmdaltctr/claude-gemini-mcp-slim
- **LobeHub**: https://lobehub.com/mcp/cmdaltctr-claude-gemini-mcp-slim
- **What it does**: Lightweight MCP integration bringing Gemini AI to Claude Code. 1M+ token context window, smart model selection (Flash for quick queries, Pro for deep analysis), code analysis with security/performance/architecture insights, 20+ slash commands.
- **Why relevant**: SKUNK'D integrates Gemini for AI opponent logic and card play analysis. This MCP lets Claude leverage Gemini during development for code review, architecture analysis, and testing Gemini API patterns.

### Gemini MCP Server (Smithery)
- **Source**: https://smithery.ai/server/mcp-server-gemini
- **What it does**: Comprehensive Gemini integration supporting text generation, chat completions, and multimodal capabilities via Google Gemini API.
- **Why relevant**: Test Gemini API integration patterns directly from Claude Code during development.

### Gemini Image Generation (Smithery)
- **Source**: https://smithery.ai/server/@falahgs/imagen-3-0-generate-google-mcp-server
- **What it does**: Generate images using Google's Imagen 3.0 model via Gemini API. Automatic file management and HTML previews.
- **Why relevant**: Generate card art, skunk mascot variations, and game UI assets using the same Gemini infrastructure SKUNK'D already depends on.

### Composio Gemini Toolkit
- **Source**: https://composio.dev/toolkits/gemini/framework/claude-code
- **What it does**: Full Gemini MCP integration with structured tool calling, message history handling, and model orchestration.
- **Why relevant**: Production-grade Gemini integration patterns for the AI opponent and hint system.

---

## 8. IMAGE GENERATION (CARD ART / ASSETS)

### Game Asset MCP (Smithery)
- **Source**: https://smithery.ai/server/@prifmkitp/game-asset-mcp
- **Also**: https://smithery.ai/server/@StreetJammer/game-asset-mcp
- **What it does**: Generates 2D and 3D game assets from text prompts using AI models on Hugging Face Spaces. Creates pixel art sprites and 3D models. Assets auto-saved and organized locally. Supports MCP-compatible clients.
- **Why relevant**: Generate card back designs, skunk mascot sprites, game board textures, UI icons, and other visual assets for SKUNK'D.

### AI Image-Gen Server (Smithery)
- **Source**: https://smithery.ai/server/@krystian-ai/ai-image-gen-mcp
- **What it does**: High-quality AI image generation using DALL-E 3, DALL-E 2, and GPT-Image-1. Unified interface for styled, sized, and batch-generated images.
- **Why relevant**: Higher-quality image generation for marketing assets, app store screenshots, and premium card art.

### fal.ai Image Generation (Smithery)
- **Source**: https://smithery.ai/server/@madhusudan-kulkarni/mcp-fal-ai-image
- **What it does**: Generate images from text prompts using fal.ai via MCP. Integrates with AI IDEs.
- **Why relevant**: Alternative image generation pipeline. fal.ai offers fast inference for iterating on card designs.

### Recraft MCP Server (Smithery)
- **Source**: https://smithery.ai/server/@recraft-ai/mcp-recraft-server
- **What it does**: Generate and edit raster and vector images. Create custom styles, vectorize images, remove/replace backgrounds, upscale images.
- **Why relevant**: Vector art generation for scalable game assets (SVG cards, icons). Background removal for compositing card art. Style customization for SKUNK'D branding.

### Together Flux Image Generator (Smithery)
- **Source**: https://smithery.ai/server/togethercomputer/together-flux-mcp
- **What it does**: Generate images using Together AI's Flux Schnell API. High-quality image creation.
- **Why relevant**: Fast, high-quality image generation for prototyping card designs and game assets.

---

## 9. REAL-TIME / MULTIPLAYER

### Supabase Realtime Sync Plugin (from Supabase Marketplace)
- **Source**: https://github.com/rdimascio/supabase-marketplace (Realtime Sync plugin)
- **What it does**: WebSocket subscriptions for presence and database changes. Handles real-time state synchronization between clients.
- **Why relevant**: Core multiplayer infrastructure for SKUNK'D. Presence tracking shows who's online/in-game. Database change subscriptions sync game state (card plays, scores, turns) between players in real-time.

### Supabase MCP Server (Realtime features)
- **Source**: https://smithery.ai/server/@supabase-community/supabase-mcp
- **What it does**: Includes real-time subscription management alongside database and auth operations.
- **Why relevant**: Design and test realtime channel configurations, presence management, and broadcast patterns directly from Claude Code.

---

## 10. GAME DEVELOPMENT SPECIFIC

### Claude-Code-Game-Master
- **Source**: https://github.com/Sstobo/Claude-Code-Game-Master
- **What it does**: Total conversion for Claude Code using RAG and RPG ruleset APIs. Modular fork featuring optional systems for encounters and game mechanics.
- **Why relevant**: While RPG-focused, the modular game system architecture (rules engine, state management, encounter/turn system) is transferable to cribbage game design patterns.

### One-Button Game Creation
- **Source**: https://github.com/abagames/claude-one-button-game-creation
- **What it does**: Claude Code generates games using genetic algorithm evaluation to ensure skilled play outperforms random input.
- **Why relevant**: The genetic algorithm approach to game balance testing could inform AI opponent difficulty tuning in SKUNK'D.

---

## 11. FRONTEND DESIGN & UI QUALITY

### Claude-Code-Frontend-Design-Toolkit (wilwaldon)
- **Source**: https://github.com/wilwaldon/Claude-Code-Frontend-Design-Toolkit
- **What it does**: Comprehensive toolkit combining skills, plugins, MCP servers, and CLAUDE.md tricks for better frontends. Includes 240+ styles, 127 font pairings, 99 UX guidelines with v2.0 reasoning engine. Recommends: Playwright MCP for E2E testing, Chrome DevTools MCP for debugging, 3-5 max active MCP servers.
- **Why relevant**: One-stop reference for making SKUNK'D look professional. Font pairings for game UI, UX guidelines for card interactions, style recommendations for the skunk theme.

### BrowserTools MCP (Smithery)
- **Source**: https://smithery.ai/server/@AgentDeskAI/browser-tools-mcp
- **GitHub**: https://github.com/AgentDeskAI/browser-tools-mcp
- **What it does**: Monitor browser logs, network activity, and capture screenshots directly from Claude Code. Communicates via Chrome Extension and NodeJS API.
- **Why relevant**: Debug the PWA in real-time. Monitor WebSocket connections for multiplayer, check network performance, capture screenshots for visual regression testing.

### Chrome DevTools MCP (Smithery)
- **Source**: https://smithery.ai/skills/jimmypaolini/mcp-chrome-devtools
- **What it does**: Browser debugging, performance profiling, and runtime inspection via MCP.
- **Why relevant**: Profile game rendering performance, debug memory leaks during long game sessions, inspect network traffic for Supabase realtime connections.

---

## 12. DEVELOPMENT WORKFLOW & PRODUCTIVITY

### Claude Code Plugins Plus Skills (jeremylongshore)
- **Source**: https://github.com/jeremylongshore/claude-code-plugins-plus-skills
- **What it does**: 270+ plugins with 739 agent skills, production orchestration patterns, 11 Jupyter notebooks for interactive tutorials, and CCPI package manager.
- **Why relevant**: Massive collection to cherry-pick specific skills from. Includes E2E test framework, component testing, and other patterns directly applicable to SKUNK'D.

### Tooling Setup Skill
- **Source**: https://playbooks.com/skills/madappgang/claude-code/tooling-setup
- **What it does**: Sets up React 19 projects with Vite, TypeScript, Biome, and Vitest for fast, consistent tooling.
- **Why relevant**: Validates and optimizes the SKUNK'D project toolchain setup.

### aitmpl.com Skill Creator
- **Source**: https://app.aitmpl.com/skills
- **Component**: https://www.aitmpl.com/component/skill/skill-creator
- **What it does**: Platform with 100+ agents, 159+ commands. Browse and install agents, commands, skills, MCPs, settings, hooks, and plugins. Includes a skill creator for building custom skills.
- **Why relevant**: Create custom SKUNK'D-specific skills (cribbage scoring rules, card evaluation patterns) that persist across sessions.

### aitmpl-downloader Skill (Smithery)
- **Source**: https://smithery.ai/skills/s-hiraoku/aitmpl-downloader
- **What it does**: Download and install Claude Code templates from aitmpl.com directly.
- **Why relevant**: Streamlined access to aitmpl.com's template library from within Claude Code.

---

## 13. DOCUMENTATION & CONTEXT

### Context7 MCP
- **Source**: https://context7.com/docs/clients/claude-code
- **Plugin Page**: https://claude.com/plugins/context7
- **What it does**: Delivers up-to-date, version-specific documentation and code examples for 1000+ libraries directly into prompts. Supports React, Supabase, Tailwind, and more. Add "use context7" to any prompt or let it auto-trigger.
- **Why relevant**: Critical for ensuring Claude uses current API docs for React 18, Supabase client SDK, Tailwind CSS, and vite-plugin-pwa rather than outdated training data. Prevents deprecated API usage.

### Firecrawl Plugin
- **Source**: https://www.firecrawl.dev/blog/firecrawl-official-claude-plugin
- **What it does**: Official Claude plugin for web data extraction. Clean, structured web content for Claude to consume. Useful for researching game rules, competitor analysis, and documentation.
- **Why relevant**: Research cribbage rules, scoring variations, and competitor cribbage apps by crawling their documentation and app store listings.

---

## 14. META-RESOURCES (CURATED LISTS)

### awesome-claude-code (hesreallyhim)
- **Source**: https://github.com/hesreallyhim/awesome-claude-code
- **What it does**: Curated list of skills, hooks, slash-commands, agent orchestrators, applications, and plugins. Regularly updated community resource.
- **Why relevant**: Discovery resource for finding new tools as the SKUNK'D project evolves.

### awesome-claude-plugins (ComposioHQ)
- **Source**: https://github.com/ComposioHQ/awesome-claude-plugins
- **What it does**: Curated list of plugins that extend Claude Code with custom commands, agents, hooks, and MCP servers.
- **Why relevant**: Another discovery resource with different curation perspective.

### Claude Code Plugins Hub (claudecodeplugins.io)
- **Source**: https://claudecodeplugins.io/
- **What it does**: Searchable directory of Claude Code plugins and agent skills with categories, ratings, and installation instructions.
- **Why relevant**: Central discovery hub for finding and evaluating plugins.

### ClaudePluginHub (claudepluginhub.com)
- **Source**: https://www.claudepluginhub.com/plugins
- **What it does**: Browse and discover Claude Code plugins across categories including web development, testing, database, and more.
- **Why relevant**: Alternative plugin marketplace with different listings.

### Claude Code Plugin Marketplace (claudemarketplaces.com)
- **Source**: https://claudemarketplaces.com/
- **What it does**: Aggregated marketplace view of Claude Code plugins and extensions.
- **Why relevant**: Cross-reference for finding the best version of similar plugins.

---

## 15. INSTALLATION QUICK REFERENCE

### Priority 1 -- Install Immediately (Core Workflow)

```bash
# Superpowers - structured development with TDD
claude plugin install superpowers

# Context7 MCP - up-to-date docs for React, Supabase, Tailwind
claude mcp add context7 -- cmd /c npx -y @upstash/context7-mcp

# Supabase MCP - direct database management
claude mcp add supabase -- cmd /c npx -y @supabase/mcp

# Vitest MCP - test runner with coverage
claude mcp add vitest -- cmd /c npx -y @djankies/vitest-mcp

# Frontend Design - better UI output
claude plugin install frontend-design
```

### Priority 2 -- Install for Development Phase

```bash
# Supabase Pack - 30 auto-triggering skills
npm install @intentsolutionsio/supabase-pack

# shadcn/ui Blocks Skill
# Clone: https://github.com/masonjames/Shadcnblocks-Skill

# Playwright Skill - E2E testing
# Clone: https://github.com/lackeyjb/playwright-skill

# React Marketplace plugins
# Clone: https://github.com/rdimascio/react-marketplace

# Tailwind CSS Marketplace plugins
# Clone: https://github.com/rdimascio/tailwindcss-marketplace
```

### Priority 3 -- Install for Specific Features

```bash
# Gemini MCP - for AI opponent development
claude mcp add gemini -- cmd /c npx -y @google/gemini-cli

# Game Asset MCP - for generating card art
# Install via Smithery: https://smithery.ai/server/@prifmkitp/game-asset-mcp

# BrowserTools MCP - for debugging PWA
# Install via Smithery: https://smithery.ai/server/@AgentDeskAI/browser-tools-mcp

# Ralph Loop - for batch automation
claude plugin install ralph-loop

# Vercel Deploy - for preview deployments
# Clone: https://github.com/vercel/vercel-deploy-claude-code-plugin
```

### Windows-Specific Notes

Per your CLAUDE.md configuration:
- MCP servers require `cmd /c` wrapper for npm-based servers
- Use absolute paths in MCP server args
- Python servers need absolute uvx path: `C:\Users\msenf\pipx\venvs\uv\Scripts\uvx.exe`
- JSON paths use forward slashes or escaped backslashes
- Verify with `claude mcp list` after installation

---

## SUMMARY: TOP 10 MOST IMPACTFUL FOR SKUNK'D

| Rank | Tool | Category | Impact |
|------|------|----------|--------|
| 1 | Superpowers | Workflow | Structured TDD development for game logic |
| 2 | Supabase MCP Server | Backend | Direct DB design and management |
| 3 | Context7 MCP | Documentation | Current docs for all stack libraries |
| 4 | Vitest MCP | Testing | AI-optimized test runner with coverage |
| 5 | Supabase Marketplace | Backend | 10 plugins covering all Supabase needs |
| 6 | Playwright Skill | Testing | E2E testing for game flows |
| 7 | Shadcnblocks-Skill | UI | 2,500+ shadcn/ui components knowledge |
| 8 | Frontend Design | UI | Distinctive visual design direction |
| 9 | Claude-Gemini MCP Slim | AI | Gemini integration for AI opponent |
| 10 | Ralph Loop | Workflow | Autonomous batch development loops |
