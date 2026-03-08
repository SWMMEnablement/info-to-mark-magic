# BobSWMM URL to Markdown Converter — Handover Document

**Version:** 1.0  
**Date:** 2026-03-08  
**Project URL:** https://lovable.dev/projects/ef41f2de-370a-47bc-adf2-fed32a053c2f  
**Published URL:** https://info-to-mark-magic.lovable.app

---

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Technology Stack](#2-technology-stack)
- [3. Architecture Overview](#3-architecture-overview)
- [4. Project Structure](#4-project-structure)
- [5. Core Features](#5-core-features)
  - [5.1 URL Auto-Fetch Scraping](#51-url-auto-fetch-scraping)
  - [5.2 Manual HTML Paste](#52-manual-html-paste)
  - [5.3 Firecrawl Integration](#53-firecrawl-integration)
  - [5.4 Sitemap Crawler](#54-sitemap-crawler)
  - [5.5 Markdown Editor & Preview](#55-markdown-editor--preview)
  - [5.6 Comparison View](#56-comparison-view)
  - [5.7 Export Options](#57-export-options)
  - [5.8 Template Library](#58-template-library)
  - [5.9 Workflow Diagram](#59-workflow-diagram)
- [6. Backend (Edge Functions)](#6-backend-edge-functions)
  - [6.1 scrape-to-markdown](#61-scrape-to-markdown)
  - [6.2 firecrawl-scrape](#62-firecrawl-scrape)
- [7. Database Schema](#7-database-schema)
- [8. Component Reference](#8-component-reference)
- [9. Utility Modules](#9-utility-modules)
- [10. Configuration & Environment](#10-configuration--environment)
- [11. Security Measures](#11-security-measures)
- [12. UI/UX Design](#12-uiux-design)
- [13. Known Limitations](#13-known-limitations)
- [14. Future Enhancement Ideas](#14-future-enhancement-ideas)
- [15. Development & Deployment](#15-development--deployment)

---

## 1. Project Overview

**BobSWMM URL to Markdown Converter** is a web application that converts web pages into clean, formatted Markdown documents. It supports multiple input methods (URL fetch, manual HTML paste, Firecrawl API, sitemap crawling) and provides rich editing, preview, comparison, and export capabilities.

**Primary Use Case:** Converting website documentation, blog posts, API docs, and technical specifications into portable Markdown files — particularly for the BobSWMM ecosystem.

**Key Capabilities:**
- Scrape single URLs or entire sitemaps
- Convert HTML to structured Markdown with configurable heading levels
- Edit, preview, and compare source HTML with generated Markdown
- Export to Markdown (.md), Plain Text (.txt), HTML (.html), and PDF (.pdf)
- Template library for structured content creation
- Dark/light theme support

---

## 2. Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | ^18.3.1 | UI framework |
| TypeScript | - | Type safety |
| Vite | - | Build tool & dev server |
| Tailwind CSS | - | Utility-first CSS |
| shadcn/ui | - | Component library (Radix UI based) |
| React Router DOM | ^6.30.1 | Client-side routing |
| TanStack React Query | ^5.83.0 | Server state management |
| react-markdown | ^10.1.0 | Markdown rendering |
| react-syntax-highlighter | ^16.1.0 | Code syntax highlighting |
| remark-gfm | ^4.0.1 | GitHub Flavored Markdown support |
| jsPDF | ^3.0.3 | PDF generation |
| mermaid | ^11.12.1 | Workflow diagrams |
| @uiw/react-textarea-code-editor | ^3.1.1 | Code editor component |
| lucide-react | ^0.462.0 | Icons |
| next-themes | ^0.3.0 | Theme management |

### Backend
| Technology | Purpose |
|---|---|
| Supabase (Lovable Cloud) | Backend platform |
| Deno Edge Functions | Server-side scraping logic |
| Firecrawl API | JavaScript-heavy site scraping (optional) |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                   │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ ScraperForm  │  │MarkdownPreview│  │ComparisonView│ │
│  │ (main UI)   │  │  (renderer)   │  │ (side-by-side)│ │
│  └──────┬──────┘  └──────────────┘  └─────────────┘ │
│         │                                             │
│  ┌──────┴──────────────────────────────────────────┐ │
│  │           Utility Modules                        │ │
│  │  htmlToMarkdown · pdfExport · htmlExport         │ │
│  │  xmlExport · markdownUtils · markdownTemplates   │ │
│  └──────┬──────────────────────────────────────────┘ │
└─────────┼───────────────────────────────────────────┘
          │ HTTP / SSE
┌─────────┼───────────────────────────────────────────┐
│         ▼        Supabase Edge Functions              │
│  ┌─────────────────────┐  ┌────────────────────────┐ │
│  │ scrape-to-markdown   │  │  firecrawl-scrape      │ │
│  │ (basic + sitemap +   │  │  (Firecrawl API proxy) │ │
│  │  auto-discover)      │  │                        │ │
│  └─────────────────────┘  └────────────────────────┘ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │              PostgreSQL Database                  │ │
│  │  scraped_projects · scraped_pages                 │ │
│  └─────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Input** → URL or pasted HTML
2. **Edge Function** → Fetches and processes HTML server-side
3. **HTML → Markdown Conversion** → Server-side (edge function) or client-side (`htmlToMarkdown.ts`)
4. **Result Display** → Edit/Preview/Split/Source/Comparison views
5. **Export** → Client-side generation of PDF/HTML/TXT/MD files

---

## 4. Project Structure

```
├── public/
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
├── src/
│   ├── App.tsx                          # Root component with routing
│   ├── App.css                          # Global styles
│   ├── main.tsx                         # Entry point
│   ├── index.css                        # Tailwind directives & CSS variables
│   ├── components/
│   │   ├── ScraperForm.tsx              # **Main component** (919 lines) — input, scraping, results
│   │   ├── MarkdownPreview.tsx          # Renders markdown with syntax highlighting
│   │   ├── MarkdownEditor.tsx           # Standalone editor with edit/split/preview modes
│   │   ├── ComparisonView.tsx           # Side-by-side HTML↔Markdown comparison (546 lines)
│   │   ├── CodeViewerWithLineNumbers.tsx # Read-only code viewer with line numbers
│   │   ├── BatchExport.tsx              # Batch export manager for multiple scrapes
│   │   ├── TemplateLibrary.tsx          # Pre-built markdown template selector
│   │   ├── WorkflowDiagram.tsx          # Mermaid.js workflow visualization
│   │   ├── ThemeProvider.tsx            # Dark/light theme context
│   │   ├── ThemeToggle.tsx              # Theme switch button
│   │   ├── NavLink.tsx                  # Navigation link component
│   │   └── ui/                          # shadcn/ui component library (40+ components)
│   ├── hooks/
│   │   ├── use-mobile.tsx               # Mobile breakpoint detection
│   │   └── use-toast.ts                 # Toast notification hook
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts                # Supabase client (auto-generated, DO NOT EDIT)
│   │       └── types.ts                 # Database types (auto-generated, DO NOT EDIT)
│   ├── lib/
│   │   └── utils.ts                     # cn() utility for className merging
│   ├── pages/
│   │   ├── Index.tsx                    # Home page (renders ScraperForm + WorkflowDiagram)
│   │   └── NotFound.tsx                 # 404 page
│   └── utils/
│       ├── htmlToMarkdown.ts            # Client-side HTML→Markdown converter
│       ├── htmlExport.ts                # HTML file export with styling
│       ├── pdfExport.ts                 # PDF generation using jsPDF
│       ├── xmlExport.ts                 # XML sitemap export
│       ├── markdownUtils.ts             # TOC generation, anchors
│       ├── markdownTemplates.ts         # Pre-built template definitions
│       └── urlValidation.ts             # URL validation utilities
├── supabase/
│   ├── config.toml                      # Supabase configuration (auto-generated, DO NOT EDIT)
│   └── functions/
│       ├── scrape-to-markdown/
│       │   └── index.ts                 # Main scraping edge function (797 lines)
│       └── firecrawl-scrape/
│           └── index.ts                 # Firecrawl API proxy edge function
├── index.html                           # HTML entry point
├── vite.config.ts                       # Vite configuration
├── tailwind.config.ts                   # Tailwind configuration
├── tsconfig.json                        # TypeScript configuration
├── components.json                      # shadcn/ui configuration
└── package.json                         # Dependencies & scripts
```

---

## 5. Core Features

### 5.1 URL Auto-Fetch Scraping

**Component:** `ScraperForm.tsx`  
**Backend:** `scrape-to-markdown` edge function

- User enters a URL and clicks "Fetch & Convert to Markdown"
- Edge function fetches HTML server-side with a browser-like User-Agent
- Extracts main content (looks for `<main>`, `<article>`, or content divs)
- Converts HTML to Markdown preserving headings, links, lists, tables, code blocks, images
- Extracts page title from `<title>` tag and prepends as H1
- Returns both converted Markdown and raw HTML source

**Configuration Options:**
- **Section Title** (optional): Prepends a custom H1 heading
- **Section Heading Level**: Choose H2–H6 for sub-section headings (default H2)

### 5.2 Manual HTML Paste

- Toggle between "Auto-Fetch URL" and "Manual Paste" modes
- Paste raw HTML into a textarea
- Client-side conversion using `htmlToMarkdown.ts`
- Supports the same heading level configuration
- Content accumulates — multiple pastes append with `---` separators

### 5.3 Firecrawl Integration

**Component:** `ScraperForm.tsx` (toggle switch)  
**Backend:** `firecrawl-scrape` edge function  
**API Key Required:** `FIRECRAWL_API_KEY` (stored as backend secret)

- Toggle "Use Firecrawl (for JavaScript-heavy sites)"
- Calls Firecrawl API v1 `/scrape` endpoint
- Returns both Markdown and HTML formats
- Mutually exclusive with Sitemap mode
- Best for SPAs, React/Angular sites, and pages requiring JS rendering

### 5.4 Sitemap Crawler

**Component:** `ScraperForm.tsx` (toggle switch + max pages input)  
**Backend:** `scrape-to-markdown` edge function (sitemap + auto-discover modes)

- Toggle "Crawl entire sitemap"
- Configurable max pages (1–100, default 10, server max 50)
- Fetches `/sitemap.xml` from the target domain
- Parses XML sitemap for page URLs
- Streams results via Server-Sent Events (SSE):
  - `start` event: total URL count
  - `progress` event: per-page progress with success/failure status
  - `complete` event: final statistics
- Progress bar in UI shows real-time crawling status
- Also supports auto-discovery of blog links and custom URL lists

### 5.5 Markdown Editor & Preview

**View Modes** (5 modes in `ScraperForm.tsx`):

| Mode | Description |
|---|---|
| **Edit** | Full-width code editor with Markdown syntax highlighting |
| **Split** | Side-by-side editor + live preview |
| **Preview** | Full-width rendered Markdown preview |
| **Source** | Read-only HTML source with line numbers |
| **Compare** | Side-by-side HTML↔Markdown comparison |

**Standalone Editor** (`MarkdownEditor.tsx`):
- Edit/Split/Preview modes
- Syntax theme selector (VS Code Dark+, One Dark, Atom Dark, Night Owl, Dracula, VS Light)

**Preview Features** (`MarkdownPreview.tsx`):
- GitHub Flavored Markdown (tables, strikethrough, task lists)
- Syntax-highlighted code blocks (6 themes via Prism)
- Styled headings with border separators
- External links open in new tabs
- Responsive tables with horizontal scroll

### 5.6 Comparison View

**Component:** `ComparisonView.tsx` (546 lines)

A sophisticated side-by-side comparison tool:

- **Dual Panel Layout**: HTML source on left, Markdown on right (swappable)
- **Synchronized Scrolling**: Toggle sync scroll between panels
- **Cross-Panel Search**: Search text across both HTML and Markdown simultaneously
- **Text Highlighting**: Select text in one panel to highlight corresponding content in the other
- **Match Confidence Scoring**: Color-coded confidence levels:
  - 🟢 High (70%+) — Green
  - 🟡 Medium (50–70%) — Yellow
  - 🟠 Low (<50%) — Orange
- **Statistics Dashboard**:
  - Character, word, and line counts for both formats
  - Compression ratio (Markdown size vs HTML size)
- **Copy Buttons**: Copy HTML or Markdown independently

### 5.7 Export Options

All exports are generated **client-side** (no server round-trip needed):

| Format | File | Description |
|---|---|---|
| **Markdown** | `.md` | Raw Markdown text download |
| **Plain Text** | `.txt` | Stripped formatting (headings, bold, links removed) |
| **HTML** | `.html` | Fully styled standalone HTML with TOC, light/dark theme, print styles |
| **PDF** | `.pdf` | Multi-page PDF with title page, TOC, formatted content, page numbers |

**PDF Export Features:**
- Custom filename dialog
- Auto-generated filename from URL hostname + timestamp
- Title page with generation date and section count
- Table of contents with heading hierarchy
- Proper heading sizes (H1=20pt, H2=16pt, H3=14pt, H4=12pt)
- Automatic page breaks
- Page numbers ("Page X of Y")
- Bullet list formatting
- Section separators (horizontal rules)

**HTML Export Features:**
- Self-contained single-file HTML
- Inline CSS (no external dependencies)
- Light and dark theme variants
- Responsive design with print media query
- Table of contents with anchor links
- Styled headings, code blocks, tables, blockquotes

**Source HTML Options:**
- Download as `.html` file
- Download as PDF (source code formatted)
- Copy to clipboard

### 5.8 Template Library

**Component:** `TemplateLibrary.tsx`  
**Data:** `markdownTemplates.ts`

Pre-built Markdown templates organized by category:

| Template | Category | Description |
|---|---|---|
| Documentation | documentation | Standard docs with prerequisites, installation, usage, config table |
| Blog Post | blog | Blog format with intro, sections, takeaways, conclusion |
| Technical Specification | technical | Spec document with requirements tables, architecture, API design, testing |
| API Documentation | api | REST API docs with endpoints, auth, rate limiting, error handling, SDKs |

Each template includes realistic placeholder content. Templates can be applied to replace or seed content.

### 5.9 Workflow Diagram

**Component:** `WorkflowDiagram.tsx`

- Collapsible Mermaid.js flowchart
- Shows the complete scraping workflow: Input → Convert → Accumulate → Export
- Uses theme-aware colors (reads CSS custom properties)
- Lazy-rendered (only when expanded)

---

## 6. Backend (Edge Functions)

### 6.1 scrape-to-markdown

**File:** `supabase/functions/scrape-to-markdown/index.ts` (797 lines)  
**Endpoint:** `POST /functions/v1/scrape-to-markdown`

This is the primary backend function handling all scraping logic.

#### Request Parameters

```typescript
{
  url: string;                    // Required — target URL
  useSitemap?: boolean;           // Enable sitemap crawling (default: false)
  maxPages?: number;              // Max pages for sitemap mode (default: 50, max: 50)
  stream?: boolean;               // Enable SSE streaming (default: false)
  autoDiscoverLinks?: boolean;    // Auto-discover blog links (default: false)
  customUrls?: string[];          // Custom URL list to scrape (max: 100)
  sectionHeadingLevel?: number;   // Heading level for sections (default: 2)
}
```

#### Operating Modes

1. **Single Page** — Scrapes one URL, returns `{ markdown, html }`
2. **Sitemap (non-streaming)** — Fetches sitemap.xml, scrapes all URLs, returns combined markdown
3. **Sitemap (streaming)** — Same as above but returns SSE stream with per-page progress
4. **Auto-Discover (streaming)** — Discovers blog links from page, scrapes each
5. **Custom URLs (streaming)** — Scrapes a provided list of URLs with progress
6. **Preview Mode** — Returns discovered URLs without scraping (no stream)

#### HTML → Markdown Conversion (Server-Side)

The `scrapeUrlToMarkdown()` function:

1. Fetches HTML with browser-like headers
2. Removes `<script>` and `<style>` tags
3. Extracts page title from `<title>` tag
4. Converts `<section>` tags with `aria-label`/`data-title` to headings
5. Attempts to extract main content (`<main>`, `<article>`, content divs)
6. Converts HTML elements to Markdown:
   - Headings (`h1`–`h6` → `#`–`######`)
   - Paragraphs, line breaks
   - Bold (`<strong>`, `<b>` → `**text**`)
   - Italic (`<em>`, `<i>` → `*text*`)
   - Links (`<a>` → `[text](url)`)
   - Images (`<img>` → `![alt](src)`)
   - Code blocks (`<pre><code>` → ` ```code``` `)
   - Inline code (`<code>` → `` `code` ``)
   - Blockquotes (`<blockquote>` → `> text`)
   - Lists (ordered and unordered)
   - Horizontal rules
7. Decodes HTML entities (`&amp;`, `&nbsp;`, `&rsquo;`, etc.)
8. Cleans up excessive newlines

#### Security Features

- **SSRF Prevention**: Blocks requests to localhost, private IPs (10.x, 172.16–31.x, 192.168.x), link-local, IPv6 private
- **Rate Limiting**: 100 requests/hour per IP (in-memory tracking)
- **Input Validation**: URL validation, maxPages bounds checking, custom URL count limits
- **Request Logging**: IP-based audit logging with timestamps

#### Sitemap Parsing

- Fetches `/sitemap.xml` from the target domain
- Parses XML to extract `<loc>` URLs
- Supports `<priority>` ordering
- Falls back to single URL if sitemap not found

### 6.2 firecrawl-scrape

**File:** `supabase/functions/firecrawl-scrape/index.ts` (76 lines)  
**Endpoint:** `POST /functions/v1/firecrawl-scrape`

A lightweight proxy to the Firecrawl API:

```typescript
// Request
{ url: string }

// Response
{ success: boolean, markdown: string, html: string }
```

- Requires `FIRECRAWL_API_KEY` environment variable
- Calls Firecrawl API v1 `/scrape` endpoint
- Requests both `markdown` and `html` formats
- Returns cleaned data from Firecrawl response

---

## 7. Database Schema

Two tables exist for storing scraped content (currently used for data persistence):

### scraped_projects

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| name | text | No | - | Project name |
| base_url | text | No | - | Base URL of the scraped site |
| created_at | timestamptz | Yes | now() | Creation timestamp |
| updated_at | timestamptz | Yes | now() | Last update timestamp |

### scraped_pages

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| id | uuid | No | gen_random_uuid() | Primary key |
| project_id | uuid | No | - | FK → scraped_projects.id |
| parent_id | uuid | Yes | null | FK → scraped_pages.id (self-referential for hierarchy) |
| url | text | No | - | Page URL |
| title | text | No | - | Page title |
| content | text | No | - | Markdown content |
| level | integer | Yes | null | Heading level for hierarchy |
| order_index | integer | Yes | null | Sort order within parent |
| created_at | timestamptz | Yes | now() | Scrape timestamp |

**Relationships:**
- `scraped_pages.project_id` → `scraped_projects.id` (many-to-one)
- `scraped_pages.parent_id` → `scraped_pages.id` (self-referential, hierarchical structure)

> **Note:** The database tables are defined but the current UI primarily operates in-memory (client-side state). Database persistence integration is available for future enhancement.

---

## 8. Component Reference

### ScraperForm (Main Component)

**File:** `src/components/ScraperForm.tsx` — 919 lines  
**Role:** Primary UI component handling all user interactions

**State Management:**
| State | Type | Purpose |
|---|---|---|
| `url` | string | Input URL |
| `htmlContent` | string | Pasted HTML content |
| `markdown` | string | Accumulated Markdown output |
| `isLoading` | boolean | Loading state |
| `viewMode` | `'edit' \| 'preview' \| 'split' \| 'source' \| 'comparison'` | Current view |
| `useManualPaste` | boolean | Toggle between URL fetch and manual paste |
| `sectionTitle` | string | Optional section title |
| `sourceHtml` | string | Raw HTML source for comparison |
| `useFirecrawl` | boolean | Firecrawl mode toggle |
| `useSitemap` | boolean | Sitemap crawl toggle |
| `maxPages` | string | Max pages for sitemap crawl |
| `crawlProgress` | `{ current, total }` | Crawl progress tracking |
| `isCrawling` | boolean | Crawling state |
| `sectionHeadingLevel` | string | Heading level (2–6) |
| `showPdfDialog` | boolean | PDF export dialog visibility |
| `pdfFilename` | string | Custom PDF filename |
| `showClearDialog` | boolean | Clear confirmation dialog |

**Key Behaviors:**
- Content **accumulates** — each scrape appends to existing markdown with `---` separator
- "Clear All" requires confirmation via AlertDialog
- PDF export has a filename customization dialog
- Firecrawl and Sitemap modes are mutually exclusive
- View mode buttons show appropriate icons and active states

### MarkdownPreview

**File:** `src/components/MarkdownPreview.tsx` — 98 lines

Renders Markdown using `react-markdown` with:
- GFM plugin for tables, strikethrough
- Prism syntax highlighter for code blocks
- 6 color themes
- Custom styled components for all Markdown elements

### ComparisonView

**File:** `src/components/ComparisonView.tsx` — 546 lines

Features synchronized scrolling, bidirectional text highlighting with confidence scoring, dual-panel search, statistics dashboard, and panel swapping.

### BatchExport

**File:** `src/components/BatchExport.tsx` — 352 lines

Manages multiple saved scrapes with:
- Checkbox selection
- Individual and batch export (PDF/HTML, separate/combined)
- Combined documents with auto-generated TOC
- Timestamp and hostname display

### WorkflowDiagram

**File:** `src/components/WorkflowDiagram.tsx` — 110 lines

Collapsible Mermaid flowchart showing the app workflow. Theme-aware with dynamic color extraction from CSS variables.

---

## 9. Utility Modules

### htmlToMarkdown.ts (Client-Side Converter)

**File:** `src/utils/htmlToMarkdown.ts` — 114 lines

Client-side HTML → Markdown conversion used for manual paste mode:
- Removes scripts/styles
- Extracts main content containers
- Converts all standard HTML elements
- Decodes HTML entities
- Configurable section heading level

### pdfExport.ts

**File:** `src/utils/pdfExport.ts` — 187 lines

PDF generation using jsPDF:
- A4 portrait format, 20mm margins
- Title page with date and section count
- Table of contents with indentation
- Heading hierarchy (H1=20pt → H4=12pt)
- Auto page breaks, page numbering
- List formatting, horizontal rules

### htmlExport.ts

**File:** `src/utils/htmlExport.ts` — 329 lines

Generates standalone HTML files:
- Self-contained with inline CSS
- Light/dark theme support
- Table of contents with anchor navigation
- Print-optimized styles
- Full markdown-to-HTML conversion

### xmlExport.ts

**File:** `src/utils/xmlExport.ts` — 68 lines

XML sitemap generation:
- Standard sitemap.xml format
- Configurable priority and change frequency
- TOC items as sub-page entries
- Proper XML escaping

### markdownUtils.ts

**File:** `src/utils/markdownUtils.ts` — 59 lines

Utilities for Markdown processing:
- `generateTableOfContents()` — Extracts H2–H6 headings into TOC items
- `addTocToMarkdown()` — Inserts TOC after first heading
- `addAnchorsToMarkdown()` — Adds `{#id}` anchors to headings

### markdownTemplates.ts

**File:** `src/utils/markdownTemplates.ts` — 444 lines

Template definitions for 4 categories with full example content.

---

## 10. Configuration & Environment

### Environment Variables

| Variable | Location | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env` (auto-generated) | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env` (auto-generated) | Supabase anon key |
| `VITE_SUPABASE_PROJECT_ID` | `.env` (auto-generated) | Supabase project ID |
| `FIRECRAWL_API_KEY` | Backend secret | Firecrawl API authentication |

### Auto-Generated Files (DO NOT EDIT)

- `supabase/config.toml` — Supabase configuration
- `src/integrations/supabase/client.ts` — Supabase client
- `src/integrations/supabase/types.ts` — Database type definitions
- `.env` — Environment variables

### Build Configuration

- **Vite** with React plugin
- **TypeScript** strict mode
- **Tailwind CSS** with custom configuration
- **Path aliases**: `@/` → `./src/`

---

## 11. Security Measures

### Server-Side (Edge Functions)

1. **SSRF Prevention** — Blocks private/local network access:
   - localhost, 127.x.x.x, 10.x.x.x, 172.16–31.x.x, 192.168.x.x
   - Link-local (169.254.x.x), IPv6 localhost (::1), IPv6 private (fc00:, fe80:)

2. **Rate Limiting** — 100 requests/hour per IP address (in-memory tracking)

3. **Input Validation**:
   - URL format validation
   - `maxPages` bounds (1–50)
   - Custom URL list limit (100 URLs max)

4. **CORS Headers** — Configured for cross-origin access

5. **Request Logging** — Client IP and timestamp tracking

### Client-Side

- No sensitive data stored in localStorage
- External links open with `rel="noopener noreferrer"`
- Supabase anon key (publishable) used for client connections

---

## 12. UI/UX Design

### Theme System

- **Dark/Light mode** via `next-themes` with `ThemeProvider`
- CSS custom properties in `index.css` for all colors
- HSL color format for Tailwind semantic tokens
- Theme toggle button fixed to top-right corner

### Design Tokens (from Tailwind config)

All colors use semantic tokens:
- `--background`, `--foreground` — Base colors
- `--primary`, `--primary-foreground` — Primary accent
- `--secondary`, `--muted`, `--accent` — Supporting colors
- `--card`, `--border`, `--ring` — Component-specific
- `--destructive` — Error/danger states

### Responsive Design

- Container max-width: 1280px (`max-w-7xl`) for page, 1152px (`max-w-6xl`) for form
- Grid layouts adapt for comparison views
- Mobile-aware via `use-mobile.tsx` hook

### Interactive Elements

- Buttons with hover scale animations (`hover:scale-105`)
- Animated loading spinners (Loader2 with `animate-spin`)
- Pulsing icons for branding (`animate-pulse`)
- Gradient text for app title
- Backdrop blur on cards (`backdrop-blur-sm`)
- Smooth transitions on all interactive elements

---

## 13. Known Limitations

1. **JavaScript-Rendered Sites** — Basic scraping cannot execute JavaScript. Use Firecrawl toggle for SPAs/dynamic sites.

2. **Content Extraction** — HTML→Markdown conversion uses regex-based parsing, not a full DOM parser. Complex nested structures may not convert perfectly.

3. **Rate Limiting** — In-memory rate limiting resets on edge function cold starts.

4. **Sitemap Dependency** — Sitemap crawling requires a valid `/sitemap.xml`. Sites without sitemaps fall back to single-page mode.

5. **PDF Rendering** — PDF export uses basic text rendering (jsPDF). No image embedding, no CSS styling in PDF.

6. **Database Integration** — Database tables exist but are not actively used in the current UI flow. Content is managed in client-side React state.

7. **No Authentication** — The app operates without user authentication. All scraping is anonymous.

8. **Edge Function Timeout** — Long sitemap crawls may hit Deno edge function execution limits.

---

## 14. Future Enhancement Ideas

- **Database Persistence** — Save/load scraping projects using existing database tables
- **User Authentication** — Add login for personal scrape history
- **Batch URL Input** — Paste multiple URLs at once for bulk scraping
- **Scheduling** — Scheduled re-scraping for content monitoring
- **Diff View** — Track changes between scrape versions
- **Custom CSS Selectors** — Let users specify which HTML elements to extract
- **Image Download** — Download and embed images in exports
- **Collaborative Editing** — Real-time multi-user markdown editing
- **API Endpoint** — Public API for programmatic scraping
- **Browser Extension** — One-click scrape from any webpage

---

## 15. Development & Deployment

### Local Development

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Deployment

- **Frontend**: Deployed via Lovable → Share → Publish
- **Edge Functions**: Auto-deployed when pushed to the repository
- **Database**: Managed via Lovable Cloud (Supabase)

### Key Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

### Adding Dependencies

Use the Lovable dependency tools — do not manually edit `package.json`.

---

*This document was generated on 2026-03-08 for project handover purposes.*
