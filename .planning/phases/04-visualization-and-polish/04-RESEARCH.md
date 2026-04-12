# Phase 4: Visualization and Polish - Research

**Researched:** 2026-04-12
**Domain:** Data visualization (charting) + responsive CSS
**Confidence:** HIGH

## Summary

Phase 4 adds two capabilities: (1) a radar or bar chart showing the 4-dimension score breakdown for evaluated proposals, and (2) responsive design so all pages work on mobile devices. This is a UI-only phase with no backend changes -- it consumes evaluation data already produced by Phase 2.

The charting story is straightforward: shadcn/ui ships official chart components built on Recharts v3, including radar chart variants. Using the shadcn chart component means zero integration friction -- same theming (CSS variables), same dark/light mode support, same component patterns as the rest of the UI. Recharts is SVG-based and composable via React components (`<RadarChart>`, `<Radar>`, `<PolarAngleAxis>`, `<PolarGrid>`).

For responsive design, Tailwind CSS is already in the stack and uses mobile-first breakpoints by default. The work is an audit-and-fix pass: ensure all existing pages use responsive utilities (`sm:`, `md:`, `lg:`) and that layouts flex/stack appropriately on small screens. No new libraries are needed.

**Primary recommendation:** Use shadcn/ui's built-in chart component (Recharts v3 under the hood) for score visualization. Use a radar chart for the 4-dimension breakdown. Apply Tailwind mobile-first responsive utilities across all pages.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-02 | Score visualization showing dimensional breakdown (radar chart or bar chart) | shadcn/ui chart component with Recharts v3 RadarChart -- pre-built, themed, copy-paste ready |
| UI-05 | Responsive design (mobile-friendly via Tailwind) | Tailwind mobile-first breakpoints (sm/md/lg/xl) -- already in stack, needs audit pass on all pages |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Runtime:** Bun
- **Framework:** Next.js App Router on Vercel
- **Language:** TypeScript strict -- no `any`, no `as Type`, no `!`
- **Styling:** Tailwind CSS + shadcn/ui
- **Naming:** Semantic, business-domain names. No `Helper`, `Util` suffixes.
- **Guard clauses:** Early returns over nesting.
- **No magic numbers/strings:** Extract into named constants.
- **No flag arguments:** Split into distinct functions.

## Standard Stack

### Core (this phase only)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.8.x | Charting engine | shadcn/ui chart component uses Recharts v3 under the hood. 3.6M+ weekly npm downloads. SVG-based, composable React components. [VERIFIED: npm registry -- v3.8.1] |
| shadcn/ui chart | latest | Chart wrapper + theming | Official shadcn/ui component. Provides ChartContainer, ChartTooltip, ChartLegend with CSS variable theming that matches rest of UI. [CITED: ui.shadcn.com/docs/components/radix/chart] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts (via shadcn) | Chart.js + react-chartjs-2 | Canvas-based, better for 10K+ data points, but no shadcn integration -- would need manual theming. Our data is 4 data points per chart, so SVG performance is irrelevant. |
| Recharts (via shadcn) | D3.js directly | Maximum flexibility but enormous API surface. Massive overkill for a single radar chart. |
| Recharts (via shadcn) | Tremor | Good dashboard library, but adds a parallel component system alongside shadcn/ui. Unnecessary duplication. |

**Installation:**
```bash
# Add shadcn chart component (installs recharts as dependency)
bunx shadcn@latest add chart
```

## Architecture Patterns

### Radar Chart Component Structure

The radar chart should be a reusable client component that accepts evaluation scores and renders the 4-dimension breakdown.

```
src/
  components/
    evaluation/
      score-radar-chart.tsx    # RadarChart for 4-dimension breakdown
      score-summary-card.tsx   # Card wrapping the chart + aggregate score
```

### Pattern 1: shadcn/ui Chart with ChartConfig

**What:** Define chart configuration separately from data, using shadcn's ChartConfig pattern for labels, colors, and theming.
**When to use:** Every chart in the application.
**Example:**
```typescript
// Source: ui.shadcn.com/docs/components/radix/chart [CITED]
"use client"

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
} from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const EVALUATION_DIMENSIONS = [
  { key: "technical", label: "Technical", weight: 0.25 },
  { key: "impact", label: "Impact", weight: 0.30 },
  { key: "cost", label: "Cost Efficiency", weight: 0.20 },
  { key: "team", label: "Team", weight: 0.25 },
] as const

const chartConfig = {
  score: {
    label: "Score",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

// Data shape: array of { dimension: string, score: number }
```

### Pattern 2: Mobile-First Responsive Layout

**What:** Design for mobile first, enhance for larger screens using Tailwind breakpoint prefixes.
**When to use:** All page layouts and components.
**Example:**
```typescript
// Source: tailwindcss.com/docs/responsive-design [CITED]
// Mobile: single column, stacked
// md+: side-by-side layout
<div className="flex flex-col gap-4 md:flex-row md:gap-6">
  <div className="w-full md:w-1/2">
    {/* Radar chart */}
  </div>
  <div className="w-full md:w-1/2">
    {/* Score details */}
  </div>
</div>
```

### Pattern 3: Chart Container Sizing

**What:** ChartContainer requires a minimum height for ResponsiveContainer to measure on first render.
**When to use:** Every chart instance.
**Example:**
```typescript
// Source: ui.shadcn.com/docs/components/radix/chart [CITED]
<ChartContainer config={chartConfig} className="min-h-[250px] w-full">
  <RadarChart data={chartData}>
    <PolarGrid />
    <PolarAngleAxis dataKey="dimension" />
    <Radar
      dataKey="score"
      fill="var(--chart-1)"
      fillOpacity={0.5}
      stroke="var(--chart-1)"
    />
    <ChartTooltip content={<ChartTooltipContent />} />
  </RadarChart>
</ChartContainer>
```

### Anti-Patterns to Avoid

- **Fixed pixel widths on charts:** Use `w-full` and let ChartContainer handle responsive sizing via ResponsiveContainer. Never set `width={500}`.
- **Using `hsl(var(--chart-1))` in Recharts v3:** Use `var(--chart-1)` directly. The hsl wrapper was for Recharts v2.
- **Skipping min-h on ChartContainer:** Without a minimum height, ResponsiveContainer renders at 0 height on first paint.
- **Importing Recharts in Server Components:** Recharts uses browser APIs. Chart components must be client components (`"use client"`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Radar chart rendering | Custom SVG polygon math | Recharts RadarChart via shadcn/ui chart | Polar coordinate math, hover tooltips, responsive resizing, accessibility -- all solved |
| Responsive container | Manual resize observer | Recharts ResponsiveContainer (inside ChartContainer) | Handles resize, debouncing, SSR hydration edge cases |
| Chart theming | Manual color management | shadcn/ui ChartConfig + CSS variables | Automatic dark/light mode, consistent with rest of UI |
| Mobile testing | Manual browser resizing | Tailwind breakpoints + browser DevTools device mode | Standard approach, well-documented |

**Key insight:** With only 4 data points per chart and shadcn/ui already in the stack, there is zero reason to reach for anything beyond the built-in chart component. The entire charting feature is essentially "add shadcn chart component, write one wrapper, feed it evaluation data."

## Common Pitfalls

### Pitfall 1: Chart Hydration Mismatch

**What goes wrong:** Radar chart renders differently on server vs client, causing hydration errors.
**Why it happens:** Recharts uses browser APIs (SVG measurement, window dimensions). If the component is not marked `"use client"`, Next.js tries to render it as a Server Component.
**How to avoid:** Always add `"use client"` directive to any file that imports Recharts components. Keep chart components in dedicated client component files.
**Warning signs:** Console errors about hydration mismatch, chart renders then flickers.

### Pitfall 2: Radar Chart with Missing/Zero Scores

**What goes wrong:** Radar polygon collapses to a point or line when some dimensions have score 0.
**Why it happens:** All 4 evaluation agents might not have completed yet, or a dimension could genuinely score 0.
**How to avoid:** Show a loading/skeleton state when evaluation is incomplete (not all 4 dimensions present). For genuine 0 scores, the radar still renders correctly -- just a collapsed vertex.
**Warning signs:** Tiny dot in center of chart instead of a polygon shape.

### Pitfall 3: Responsive Charts Overflowing on Mobile

**What goes wrong:** Chart labels or tooltips overflow the container on small screens.
**Why it happens:** PolarAngleAxis labels for dimension names (e.g., "Cost Efficiency") can be long.
**How to avoid:** Use abbreviated labels on small screens or use the `tick` prop on PolarAngleAxis to render a custom label component that truncates. Set `outerRadius` based on container size.
**Warning signs:** Horizontal scroll appearing on mobile, labels cut off or overlapping.

### Pitfall 4: Tailwind Responsive Audit Gaps

**What goes wrong:** Pages look good on desktop but break on mobile -- text overflow, horizontal scroll, cramped touch targets.
**Why it happens:** Desktop-first development. Layouts use fixed widths or assume wide viewports.
**How to avoid:** Test every page at 375px width (iPhone SE) during development. Use `flex-col` as default, add `md:flex-row` for wider screens. Ensure touch targets are at least 44x44px.
**Warning signs:** Horizontal scrollbar on any page at mobile width.

## Code Examples

### Complete Radar Chart Component

```typescript
// Source: Composition of patterns from ui.shadcn.com/docs/components/radix/chart
// and recharts.github.io/en-US/api/RadarChart/ [CITED]
"use client"

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
} from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const DIMENSION_LABELS: Record<string, string> = {
  technical: "Technical",
  impact: "Impact",
  cost: "Cost",
  team: "Team",
}

const chartConfig = {
  score: {
    label: "Score",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

interface DimensionScore {
  dimension: string
  score: number
}

interface ScoreRadarChartProps {
  scores: ReadonlyArray<DimensionScore>
  aggregateScore: number
}

function ScoreRadarChart({ scores, aggregateScore }: ScoreRadarChartProps) {
  const chartData = scores.map((item) => ({
    dimension: DIMENSION_LABELS[item.dimension] ?? item.dimension,
    score: item.score,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="dimension" />
            <Radar
              dataKey="score"
              fill="var(--chart-1)"
              fillOpacity={0.5}
              stroke="var(--chart-1)"
              strokeWidth={2}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
```

### Responsive Page Layout Pattern

```typescript
// Source: tailwindcss.com/docs/responsive-design [CITED]
// Mobile-first: stack vertically, then side-by-side on md+
<div className="container mx-auto px-4 py-6">
  {/* Page header */}
  <h1 className="text-2xl font-bold md:text-3xl">
    {proposal.title}
  </h1>

  {/* Content grid: stack on mobile, 2-col on md+ */}
  <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
    <ScoreRadarChart scores={scores} aggregateScore={aggregate} />
    <EvaluationDetails dimensions={dimensions} />
  </div>

  {/* Per-dimension cards: stack on mobile, grid on lg+ */}
  <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {dimensions.map((dim) => (
      <DimensionCard key={dim.key} dimension={dim} />
    ))}
  </div>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recharts v2 with `hsl(var(--chart-1))` | Recharts v3 with `var(--chart-1)` directly | 2025 (shadcn/ui chart update) | Color tokens simplified, no hsl wrapper needed |
| Manual ResponsiveContainer sizing | ChartContainer from shadcn/ui handles it | 2024 (shadcn/ui chart component) | Less boilerplate, automatic theme integration |
| Tailwind v3 breakpoints | Tailwind v4 with same breakpoint system | 2025 | Breakpoint utilities unchanged, engine improvements |

**Deprecated/outdated:**
- Recharts v2 API: v3 has breaking changes in tooltip/animation APIs. shadcn/ui chart component abstracts most of this.
- `@apply` for responsive utilities: Tailwind team recommends component extraction via React components instead.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Evaluation data from Phase 2 will have 4 dimension scores as separate fields accessible from a Convex query | Code Examples | Chart component would need different data transformation |
| A2 | shadcn/ui chart component will already be available (added in an earlier phase or addable independently) | Standard Stack | Would need to run `bunx shadcn@latest add chart` as a task step |
| A3 | Existing pages from Phase 1/2 use Tailwind utility classes (not custom CSS) | Common Pitfalls | Responsive audit would be more complex if custom CSS is involved |

## Open Questions (RESOLVED)

1. **Evaluation data shape from Phase 2** -- RESOLVED
   - What we know: Each evaluation has 4 dimension scores (technical, impact, cost, team) with values 0-100
   - What's unclear: ~~Exact Convex document structure and query API for fetching scores~~
   - Resolution: Phase 2 uses `ProposalEvaluation.dimensions[]` array (not Convex). Each entry is `{ dimension: EvaluationDimension, output: { score, ... }, audit }`. Data is fetched from IPFS/on-chain. The chart component maps this to `Array<{ dimension: string, score: number }>`. See Phase 4 Plan 01 Task 1 interfaces block and Task 2 data mapping.

2. **Bar chart vs radar chart** -- RESOLVED
   - What we know: Requirements say "radar chart or bar chart" -- both are supported by shadcn/ui chart
   - What's unclear: ~~User preference~~
   - Resolution: Radar chart selected as primary visualization. Confirmed during Phase 4 discussion (04-CONTEXT.md). Radar better shows balance across dimensions at a glance and is the more visually distinctive choice for Demo Day.

## Sources

### Primary (HIGH confidence)
- [shadcn/ui Chart component docs](https://ui.shadcn.com/docs/components/radix/chart) - Installation, ChartConfig pattern, Recharts v3 integration, responsive sizing
- [shadcn/ui Radar Charts gallery](https://ui.shadcn.com/charts/radar) - Multiple radar chart variants available
- [npm: recharts v3.8.1](https://www.npmjs.com/package/recharts) - Current version verified via `npm view recharts version`

### Secondary (MEDIUM confidence)
- [Tailwind CSS Responsive Design docs](https://tailwindcss.com/docs/responsive-design) - Mobile-first breakpoint system, utility prefixes
- [Recharts RadarChart API](https://recharts.github.io/en-US/api/RadarChart/) - Component props and child components
- [shadcn/ui GitHub Discussion #4133](https://github.com/shadcn-ui/ui/discussions/4133) - Community confirms Recharts as the standard choice for shadcn charts

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - shadcn/ui officially uses Recharts, version verified on npm
- Architecture: HIGH - Standard React component patterns, well-documented shadcn/ui APIs
- Pitfalls: HIGH - Hydration mismatches and responsive overflow are well-known Next.js + charting issues

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable -- shadcn/ui chart component is mature)
