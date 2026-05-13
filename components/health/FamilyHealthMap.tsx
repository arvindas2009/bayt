'use client'

// D3 force-directed health network graph.
//
// Layout: d3-force simulation (synchronous ticks), then frozen — positions are stable.
// Nodes: sized by family role (grandparent > parent > child).
//        Status ring colour derived from the member's raw lab results.
// Edges: thickness = crossLink strength, colour = dominant pattern severity.
// Animation: SVG animateMotion dots travel along every edge — one dot per linked pattern.
// Interactions: hover node → dim unconnected edges; hover edge → tooltip + glow;
//               click node → /health/{memberId}
// Responsive: < 768 px renders a compact list instead of the SVG.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as d3 from 'd3'
import type { FamilyMember } from '@/types'
import type { CrossLink, FamilyPattern, HealthTwin } from '@/types/agents'

// ─── Canvas ───────────────────────────────────────────────────────────────────

const W = 800
const H = 500

// ─── Visual constants ─────────────────────────────────────────────────────────

// Node radius by family role — encodes importance visually
const ROLE_R: Record<string, number> = { grandparent: 36, parent: 26, child: 18 }

// Per-member personal accent (index-stable, matches CalendarConflicts)
const MEMBER_COLORS = ['#3D7FFF', '#cfbcff', '#2ECC8A', '#e7c365', '#e87040']

// Status ring colour (derived from raw health profile, not agent summary)
const RING: Record<string, string> = { good: '#2ECC8A', monitor: '#e7c365', alert: '#ffb4ab' }

// Pattern severity → edge/dot colour
const SEV: Record<string, string> = {
  critical: '#ffb4ab',
  warning:  '#e7c365',
  info:     '#cfbcff',
}

// Dot travel speed — critical = fast, info = slow
const DOT_DUR: Record<string, string> = { critical: '2.2s', warning: '3.6s', info: '5.8s' }

const SEV_RANK: Record<string, number> = { critical: 0, warning: 1, info: 2 }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function memberStatus(m: FamilyMember): 'good' | 'monitor' | 'alert' {
  const labs = m.healthProfile?.lastLabResults ?? []
  if (labs.some((l) => l.status === 'alert')) return 'alert'
  if (labs.some((l) => l.status === 'monitor') || (m.healthProfile?.riskFlags?.length ?? 0) > 0)
    return 'monitor'
  return 'good'
}

function clamp(val: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, val))
}

// ─── Types ────────────────────────────────────────────────────────────────────

// D3 mutates these nodes in-place (adds x, y, vx, vy)
interface RawNode extends d3.SimulationNodeDatum {
  id:     string
  member: FamilyMember
  r:      number
  color:  string
  status: 'good' | 'monitor' | 'alert'
  index:  number
}

interface RawLink extends d3.SimulationLinkDatum<RawNode> {
  crossLink: CrossLink
  pattern?:  FamilyPattern
}

// Settled node with concrete pixel positions
interface Node {
  id:     string
  member: FamilyMember
  r:      number
  color:  string
  status: 'good' | 'monitor' | 'alert'
  x:      number
  y:      number
}

// One edge per unique member pair; carries ALL patterns so dots stack
interface Edge {
  key:         string
  fromId:      string
  toId:        string
  x1: number; y1: number
  x2: number; y2: number
  strokeW:     number
  edgeColor:   string
  patterns:    FamilyPattern[]
}

interface Tooltip { x: number; y: number; lines: string[]; color: string }

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  members:      FamilyMember[]
  crossLinks:   CrossLink[]
  patterns:     FamilyPattern[]
  healthTwins?: HealthTwin[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FamilyHealthMap({ members, crossLinks, patterns, healthTwins = [] }: Props) {
  const twinMemberIds = useMemo(() => new Set(healthTwins.map((t) => t.memberId)), [healthTwins])
  const router = useRouter()
  const svgRef = useRef<SVGSVGElement>(null)   // D3 is bound here; positions computed via sim

  const [nodes,       setNodes]       = useState<Node[]>([])
  const [edges,       setEdges]       = useState<Edge[]>([])
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
  const [tooltip,     setTooltip]     = useState<Tooltip | null>(null)
  const [isMobile,    setIsMobile]    = useState(false)

  // ── Mobile detection ─────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── D3 force simulation ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!members.length) return

    const patternById = Object.fromEntries(patterns.map((p) => [p.id, p]))

    // Build raw nodes
    const rawNodes: RawNode[] = members.slice(0, 5).map((m, i) => ({
      id:     m.id,
      member: m,
      r:      ROLE_R[m.role] ?? 22,
      color:  MEMBER_COLORS[i] ?? '#cfbcff',
      status: memberStatus(m),
      index:  i,
    }))

    const nodeIdSet = new Set(rawNodes.map((n) => n.id))

    // Pass all crossLinks to the sim (duplicates add attraction, which is correct)
    const rawLinks: RawLink[] = crossLinks
      .filter((cl) => nodeIdSet.has(cl.fromMember) && nodeIdSet.has(cl.toMember))
      .map((cl) => ({
        source:    cl.fromMember,
        target:    cl.toMember,
        crossLink: cl,
        pattern:   patternById[cl.patternId],
      }))

    // Synchronous simulation — bind to svgRef so D3 is "attached" to the SVG element
    // (layout math only; React handles rendering)
    d3.select(svgRef.current)  // D3 bound to SVG element

    const sim = d3
      .forceSimulation<RawNode>(rawNodes)
      .force(
        'link',
        d3
          .forceLink<RawNode, RawLink>(rawLinks)
          .id((d) => d.id)
          .distance((link) => {
            const s = link.source as RawNode
            const t = link.target as RawNode
            return 100 + (s.r + t.r) * 2.2
          })
          .strength(0.35),
      )
      .force('charge', d3.forceManyBody<RawNode>().strength((d) => -(d.r * 18 + 220)))
      .force('center',  d3.forceCenter(W / 2, H / 2).strength(0.5))
      .force('collide', d3.forceCollide<RawNode>().radius((d) => d.r + 28).strength(0.85))
      .stop()

    // Run synchronously — 500 ticks is plenty for 5 nodes
    for (let i = 0; i < 500; i++) sim.tick()

    // Settle: clamp to canvas, generous padding so labels don't clip
    const settled: Node[] = rawNodes.map((n) => ({
      id:     n.id,
      member: n.member,
      r:      n.r,
      color:  n.color,
      status: n.status,
      x:      clamp(n.x ?? W / 2, n.r + 16, W - n.r - 16),
      y:      clamp(n.y ?? H / 2, n.r + 20, H - n.r - 32),
    }))

    const posById = Object.fromEntries(settled.map((n) => [n.id, n]))

    // Aggregate edges: one line per unique member pair
    // Multiple crossLinks on the same pair → multiple pulsing dots
    const pairMap = new Map<string, {
      fromId: string; toId: string
      patterns: FamilyPattern[]
      maxStrength: number
    }>()

    for (const cl of crossLinks) {
      const from = posById[cl.fromMember]
      const to   = posById[cl.toMember]
      if (!from || !to) continue

      const pairKey = [cl.fromMember, cl.toMember].sort().join('::')
      const p = patternById[cl.patternId]

      if (!pairMap.has(pairKey)) {
        pairMap.set(pairKey, {
          fromId:      cl.fromMember,
          toId:        cl.toMember,
          patterns:    p ? [p] : [],
          maxStrength: cl.strength,
        })
      } else {
        const entry = pairMap.get(pairKey)!
        if (p && !entry.patterns.some((ep) => ep.id === p.id)) entry.patterns.push(p)
        entry.maxStrength = Math.max(entry.maxStrength, cl.strength)
      }
    }

    const builtEdges: Edge[] = Array.from(pairMap.values()).map((entry) => {
      const from = posById[entry.fromId]!
      const to   = posById[entry.toId]!
      const sortedP = [...entry.patterns].sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity])
      const dominant = sortedP[0]
      return {
        key:       `${entry.fromId}::${entry.toId}`,
        fromId:    entry.fromId,
        toId:      entry.toId,
        x1: from.x, y1: from.y,
        x2: to.x,   y2: to.y,
        strokeW:   0.6 + entry.maxStrength * 2.4,
        edgeColor: SEV[dominant?.severity ?? 'info'],
        patterns:  sortedP,
      }
    })

    setNodes(settled)
    setEdges(builtEdges)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, crossLinks, patterns])

  // ── Derived interaction state ─────────────────────────────────────────────────

  const connectedEdgeKeys = useMemo(() => {
    if (!hoveredNode) return null
    return new Set(
      edges
        .filter((e) => e.fromId === hoveredNode || e.toId === hoveredNode)
        .map((e) => e.key),
    )
  }, [hoveredNode, edges])

  function edgeOpacity(e: Edge): number {
    if (hoveredEdge) return e.key === hoveredEdge ? 1 : 0.07
    if (hoveredNode)  return connectedEdgeKeys?.has(e.key) ? 0.92 : 0.07
    return 0.55
  }

  function nodeOpacity(id: string): number {
    if (hoveredEdge) {
      const e = edges.find((e) => e.key === hoveredEdge)
      return e && (e.fromId === id || e.toId === id) ? 1 : 0.3
    }
    if (hoveredNode) return id === hoveredNode ? 1 : 0.3
    return 1
  }

  // ── Mobile: compact list ──────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <section
        className="bg-[var(--surface-container-lowest)]"
        style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}
      >
        <header className="px-6 py-3">
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
            Health network · {members.length} members · {crossLinks.length} connections
          </span>
        </header>
        <div className="flex flex-col" style={{ borderTop: '1px solid var(--outline-variant)' }}>
          {members.slice(0, 5).map((m, i) => {
            const status = memberStatus(m)
            const color  = MEMBER_COLORS[i] ?? '#cfbcff'
            return (
              <button
                key={m.id}
                onClick={() => router.push(`/health/${m.id}`)}
                className="flex items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-[var(--surface-container)]"
                style={{ borderBottom: '1px solid var(--outline-variant)' }}
              >
                <div
                  className="flex size-10 shrink-0 items-center justify-center"
                  style={{ background: `${color}18`, border: `1.5px solid ${color}` }}
                >
                  <span className="font-mono text-[10px] font-bold uppercase" style={{ color }}>
                    {m.name.split(' ')[0].slice(0, 3)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-sm font-bold text-[var(--on-surface)]"
                    style={{ fontFamily: 'var(--font-space-grotesk)' }}
                  >
                    {m.name.split(' ')[0]}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                    {m.role} · {m.age}y
                  </div>
                </div>
                <div className="size-2.5 shrink-0 rounded-full" style={{ background: RING[status] }} />
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  // ── Desktop: D3 SVG graph ─────────────────────────────────────────────────────
  return (
    <section
      className="bg-[var(--surface-container-lowest)]"
      style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}
    >
      <header className="flex items-center justify-between px-10 py-3">
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
          Cross-family pattern graph · {edges.length} connections
        </span>
        <div className="flex items-center gap-5">
          {(['good', 'monitor', 'alert'] as const).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className="size-2 shrink-0 rounded-full" style={{ background: RING[s] }} />
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                {s}
              </span>
            </div>
          ))}
        </div>
      </header>

      <div className="relative overflow-hidden" style={{ background: '#080c12' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: H, display: 'block' }}
          aria-label="Family health network graph"
        >
          <defs>
            {/* Dot-grid background */}
            <pattern id="fhm-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="0.5" cy="0.5" r="0.5" fill="#1e2a38" />
            </pattern>

            {/* Named paths for animateMotion mpath references */}
            {edges.map((e) => (
              <path
                key={`def-${e.key}`}
                id={`fhm-p-${e.key.replace(/::/g, '-')}`}
                d={`M ${e.x1} ${e.y1} L ${e.x2} ${e.y2}`}
                fill="none"
              />
            ))}

            {/* Glow filter — used on hovered/alert nodes */}
            <filter id="fhm-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft glow for critical edges */}
            <filter id="fhm-edge-glow" x="-20%" y="-100%" width="140%" height="300%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width={W} height={H} fill="url(#fhm-grid)" />

          {/* ── Edges ── */}
          <g>
            {edges.map((e) => {
              const op        = edgeOpacity(e)
              const isHovered = hoveredEdge === e.key
              const pathId    = `fhm-p-${e.key.replace(/::/g, '-')}`
              const mx = (e.x1 + e.x2) / 2
              const my = (e.y1 + e.y2) / 2
              const hasCritical = e.patterns.some((p) => p.severity === 'critical')

              return (
                <g key={e.key}>
                  {/* Edge line */}
                  <line
                    x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                    stroke={e.edgeColor}
                    strokeWidth={isHovered ? e.strokeW + 1.5 : e.strokeW}
                    strokeOpacity={op}
                    filter={hasCritical && op > 0.3 ? 'url(#fhm-edge-glow)' : undefined}
                    style={{ transition: 'stroke-opacity 0.18s, stroke-width 0.18s' }}
                  />

                  {/* ── Pulsing travel dots — the WOW moment ── */}
                  {e.patterns.map((p, pi) => {
                    const dotColor = SEV[p.severity]
                    const dotR     = p.severity === 'critical' ? 4 : p.severity === 'warning' ? 3 : 2.5
                    const dur      = DOT_DUR[p.severity]
                    // stagger start: forward on even, reverse direction on odd for visual richness
                    const reverse  = pi % 2 === 1
                    const beginS   = (pi * 1.3).toFixed(1) + 's'

                    return (
                      <g key={p.id} opacity={Math.min(1, op + 0.2)}>
                        {/* Leading glow */}
                        <circle r={dotR + 2.5} fill={dotColor} opacity={0.25}>
                          <animateMotion
                            dur={dur}
                            begin={beginS}
                            repeatCount="indefinite"
                            keyPoints={reverse ? '1;0' : '0;1'}
                            keyTimes="0;1"
                            calcMode="linear"
                          >
                            <mpath href={`#${pathId}`} />
                          </animateMotion>
                        </circle>
                        {/* Solid dot */}
                        <circle r={dotR} fill={dotColor} opacity={0.9}>
                          <animateMotion
                            dur={dur}
                            begin={beginS}
                            repeatCount="indefinite"
                            keyPoints={reverse ? '1;0' : '0;1'}
                            keyTimes="0;1"
                            calcMode="linear"
                          >
                            <mpath href={`#${pathId}`} />
                          </animateMotion>
                        </circle>
                      </g>
                    )
                  })}

                  {/* Wide invisible hit area for hover */}
                  <line
                    x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                    stroke="transparent"
                    strokeWidth={22}
                    style={{ cursor: 'crosshair' }}
                    onMouseEnter={() => {
                      setHoveredEdge(e.key)
                      setTooltip({
                        x:     mx,
                        y:     my,
                        lines: e.patterns.map((p) => p.title),
                        color: e.edgeColor,
                      })
                    }}
                    onMouseLeave={() => {
                      setHoveredEdge(null)
                      setTooltip(null)
                    }}
                  />
                </g>
              )
            })}
          </g>

          {/* ── Nodes ── */}
          <g>
            {nodes.map((node) => {
              const isHovered  = hoveredNode === node.id
              const op         = nodeOpacity(node.id)
              const ringColor  = RING[node.status]
              const firstName  = node.member.name.split(' ')[0]
              const isAlert    = node.status === 'alert'

              return (
                <g
                  key={node.id}
                  opacity={op}
                  style={{ cursor: 'pointer', transition: 'opacity 0.18s' }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => router.push(`/health/${node.id}`)}
                  role="button"
                  aria-label={`View ${firstName}'s health profile`}
                >
                  {/* Outer pulsing ring (dashed when idle, solid when hovered) */}
                  <circle
                    cx={node.x} cy={node.y}
                    r={node.r + 9}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth={isHovered ? 1.8 : 1}
                    strokeOpacity={isHovered ? 0.9 : 0.4}
                    strokeDasharray={isHovered ? 'none' : '5 3'}
                  />
                  {/* Inner ring */}
                  <circle
                    cx={node.x} cy={node.y}
                    r={node.r + 3}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth={0.5}
                    strokeOpacity={isHovered ? 0.5 : 0.2}
                  />

                  {/* Node body */}
                  <circle
                    cx={node.x} cy={node.y}
                    r={node.r}
                    fill={node.color}
                    fillOpacity={isHovered ? 0.28 : 0.13}
                    stroke={node.color}
                    strokeWidth={isHovered ? 2 : 1.5}
                    filter={isHovered || isAlert ? 'url(#fhm-glow)' : undefined}
                  />

                  {/* Member initials */}
                  <text
                    x={node.x} y={node.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={node.color}
                    fontSize={node.r > 28 ? 11 : node.r > 20 ? 9 : 7.5}
                    fontFamily="var(--font-jetbrains-mono)"
                    letterSpacing="0.12em"
                    fontWeight="700"
                  >
                    {firstName.slice(0, 3).toUpperCase()}
                  </text>

                  {/* Name label below node */}
                  <text
                    x={node.x} y={node.y + node.r + 14}
                    textAnchor="middle"
                    fill={isHovered ? 'var(--on-surface)' : 'var(--on-surface-variant)'}
                    fontSize={10}
                    fontFamily="var(--font-jetbrains-mono)"
                    letterSpacing="0.04em"
                    style={{ transition: 'fill 0.18s' }}
                  >
                    {firstName}
                  </text>

                  {/* Role label (visible when hovered) */}
                  {isHovered && (
                    <text
                      x={node.x} y={node.y + node.r + 26}
                      textAnchor="middle"
                      fill={ringColor}
                      fontSize={8}
                      fontFamily="var(--font-jetbrains-mono)"
                      letterSpacing="0.08em"
                      textDecoration="none"
                    >
                      {node.member.role.toUpperCase()} · {node.member.age}Y
                    </text>
                  )}

                  {/* Status indicator dot (top-right of node body) */}
                  <circle
                    cx={node.x + node.r - 3} cy={node.y - node.r + 3}
                    r={5}
                    fill={ringColor}
                    stroke="#080c12"
                    strokeWidth={1.5}
                  />

                  {/* TWIN badge — shown when a generational projection exists */}
                  {twinMemberIds.has(node.id) && (
                    <g>
                      <rect
                        x={node.x - node.r + 1}
                        y={node.y + node.r - 13}
                        width={24}
                        height={10}
                        fill="#6750a4"
                        fillOpacity={0.88}
                        rx={1}
                      />
                      <text
                        x={node.x - node.r + 13}
                        y={node.y + node.r - 5.5}
                        textAnchor="middle"
                        fill="#cfbcff"
                        fontSize={6}
                        fontFamily="var(--font-jetbrains-mono)"
                        letterSpacing="0.12em"
                        fontWeight="700"
                      >
                        TWIN
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </g>

          {/* ── Edge tooltip ── */}
          {tooltip && (
            <foreignObject
              x={clamp(tooltip.x - 110, 0, W - 220)}
              y={clamp(tooltip.y - 36 - tooltip.lines.length * 14, 4, H - 80)}
              width={220}
              height={tooltip.lines.length * 16 + 20}
              style={{ overflow: 'visible', pointerEvents: 'none' }}
            >
              <div
                style={{
                  background:  'var(--surface-container-highest)',
                  border:      `1px solid ${tooltip.color}`,
                  padding:     '6px 10px',
                  fontFamily:  'var(--font-jetbrains-mono)',
                  fontSize:    10,
                  color:       'var(--on-surface)',
                  pointerEvents: 'none',
                  lineHeight:  '1.6',
                }}
              >
                {tooltip.lines.map((line, i) => (
                  <div key={i} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {i === 0 ? '' : '· '}{line}
                  </div>
                ))}
              </div>
            </foreignObject>
          )}
        </svg>
      </div>
    </section>
  )
}
