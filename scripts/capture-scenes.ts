/**
 * Stage 1 of the video pipeline: drive the running Bayt app with Playwright and record one clip per
 * scene, plus a timeline of everything that happened (cursor moves, clicks, camera focus points).
 *
 *   npx tsx scripts/capture-scenes.ts            # all five scenes
 *   npx tsx scripts/capture-scenes.ts 2 4        # only scenes 2 and 4
 *
 * Environment
 *   BASE_URL      default http://localhost:3000. Must be a server started with NEXT_PUBLIC_DEMO_MODE=true.
 *   DATABASE_URL  the SAME database that server uses. It is re-seeded before every scene so each clip
 *                 starts from a clean family (scene 2 accepts handoffs, scene 4 flips the vault).
 *                 Point it at a scratch copy, never at your real dev.db.
 *   NO_RESEED=1   skip re-seeding (not recommended).
 *   NO_OLLAMA_STUB=1  do not fake Ollama on :11434 (the vault will then read "Local model offline").
 *
 * Outputs
 *   public/recordings/sceneN-*.mp4     1920x1080, 30 fps, trimmed to the exact scene length
 *   src/remotion/timeline.json         the events the Remotion layer syncs its cursor and camera to
 */
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from 'playwright';
import { execFileSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'recordings');
const RAW_DIR = path.join(OUT_DIR, '_raw');
const TIMELINE_PATH = path.join(ROOT, 'src', 'remotion', 'timeline.json');
const W = 1920;
const H = 1080;
const FPS = 30;
/** Record a little past the scene so ffmpeg can trim to an exact length. */
const TAIL_MS = 1200;

// ── Timeline model (mirrored by src/remotion/timeline.ts) ────────────────────────────────────────
interface CursorMove { t0: number; t1: number; x0: number; y0: number; x1: number; y1: number }
interface ClickEvt { t: number; x: number; y: number; label: string }
interface FocusEvt { t: number; x: number; y: number; scale: number; label: string }
interface SceneTimeline {
  id: string;
  file: string;
  durationMs: number;
  durationFrames: number;
  cursor: CursorMove[];
  clicks: ClickEvt[];
  focus: FocusEvt[];
  marks: Record<string, number>;
  skipped: string[];
}

interface SceneDef {
  n: number;
  id: string;
  file: string;
  seconds: number;
  run: (c: Ctx) => Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

class Ctx {
  readonly t0 = performance.now();
  readonly tl: SceneTimeline;
  private cx = W * 0.62;
  private cy = H * 0.58;

  constructor(readonly page: Page, def: SceneDef) {
    this.tl = {
      id: def.id,
      file: def.file,
      durationMs: def.seconds * 1000,
      durationFrames: def.seconds * FPS,
      cursor: [],
      clicks: [],
      focus: [],
      marks: {},
      skipped: [],
    };
  }

  now() {
    return Math.round(performance.now() - this.t0);
  }

  /** Wait until the scene clock reaches `ms`. Keeps beats spread across the whole scene. */
  async at(ms: number) {
    const wait = ms - this.now();
    if (wait > 0) await sleep(wait);
  }

  mark(name: string) {
    this.tl.marks[name] = this.now();
  }

  /** A step that must not take the capture down: a missing element is logged and the scene carries on. */
  async step(name: string, fn: () => Promise<void>) {
    try {
      await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message.split('\n')[0] : String(err);
      console.warn(`  ! [${this.tl.id}] step "${name}" skipped: ${msg}`);
      this.tl.skipped.push(name);
    }
  }

  async goto(route: string) {
    await this.page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
  }

  async box(target: Locator, timeout = 8000) {
    await target.first().waitFor({ state: 'visible', timeout });
    const b = await target.first().boundingBox();
    if (!b) throw new Error('no bounding box');
    return b;
  }

  /** Glide the real mouse (so hover styles fire) and log the segment for the Remotion cursor. */
  async moveTo(x: number, y: number, ms = 750) {
    const x0 = this.cx;
    const y0 = this.cy;
    const t0 = this.now();
    // Time-driven, not step-driven: each mouse.move costs a round trip, so a fixed step count overruns badly.
    const start = performance.now();
    for (;;) {
      const raw = Math.min(1, (performance.now() - start) / ms);
      const p = easeInOut(raw);
      await this.page.mouse.move(x0 + (x - x0) * p, y0 + (y - y0) * p);
      if (raw >= 1) break;
    }
    this.cx = x;
    this.cy = y;
    this.tl.cursor.push({ t0, t1: this.now(), x0, y0, x1: x, y1: y });
  }

  async hover(target: Locator, ms = 750) {
    const b = await this.box(target);
    await this.moveTo(b.x + b.width / 2, b.y + b.height / 2, ms);
  }

  async clickAt(x: number, y: number, label: string, ms = 750) {
    await this.moveTo(x, y, ms);
    await sleep(140);
    this.tl.clicks.push({ t: this.now(), x, y, label });
    await this.page.mouse.down();
    await sleep(70);
    await this.page.mouse.up();
  }

  async click(target: Locator, label: string, ms = 750) {
    const b = await this.box(target);
    await this.clickAt(b.x + b.width / 2, b.y + b.height / 2, label, ms);
  }

  /** Tell the Remotion camera where to look (viewport coordinates) and how close. scale 1 = whole window. */
  focusPoint(x: number, y: number, scale: number, label: string) {
    this.tl.focus.push({ t: this.now(), x, y, scale, label });
  }

  async focus(target: Locator, scale: number, label: string, dy = 0) {
    const b = await this.box(target);
    this.focusPoint(b.x + b.width / 2, b.y + b.height / 2 + dy, scale, label);
  }

  focusWide(label = 'wide') {
    this.focusPoint(W / 2, H / 2, 1, label);
  }

  /** Smoothly scroll the page's scroll container so `target` sits `top` px below the viewport top. */
  async scrollTo(target: Locator, ms = 1400, top = 150) {
    await target.first().waitFor({ state: 'attached', timeout: 8000 });
    await target.first().evaluate(
      (el, args) =>
        new Promise<void>((resolve) => {
          const scroller = (document.querySelector('main.overflow-y-auto') ?? document.scrollingElement) as HTMLElement;
          const start = scroller.scrollTop;
          const wanted = el.getBoundingClientRect().top + start - args.top;
          const max = scroller.scrollHeight - scroller.clientHeight;
          const to = Math.max(0, Math.min(max, wanted));
          const t0 = performance.now();
          const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
          const tick = () => {
            const p = Math.min(1, (performance.now() - t0) / args.ms);
            scroller.scrollTop = start + (to - start) * ease(p);
            if (p < 1) requestAnimationFrame(tick);
            else resolve();
          };
          tick();
        }),
      { ms, top },
    );
  }

  async scrollToTop(ms = 1200) {
    await this.page.evaluate(
      (dur) =>
        new Promise<void>((resolve) => {
          const scroller = (document.querySelector('main.overflow-y-auto') ?? document.scrollingElement) as HTMLElement;
          const start = scroller.scrollTop;
          const t0 = performance.now();
          const tick = () => {
            const p = Math.min(1, (performance.now() - t0) / dur);
            const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
            scroller.scrollTop = start * (1 - e);
            if (p < 1) requestAnimationFrame(tick);
            else resolve();
          };
          tick();
        }),
      ms,
    );
  }

  /** Top bar: open "Viewing as" and pick a person. */
  async viewAs(name: string) {
    const { page } = this;
    await this.click(page.getByRole('button', { name: /Viewing as/ }), `Viewing as ${name}`);
    await sleep(350);
    await this.click(page.getByRole('listbox', { name: 'Viewing as' }).getByRole('button', { name: new RegExp(name) }), `Pick ${name}`, 600);
    await sleep(500);
  }
}

// ── Scenes ───────────────────────────────────────────────────────────────────────────────────────
/** Fatima's node on the Load field: label position gives x; her score gives the radius to step back up. */
async function nodeCenter(page: Page, name: string): Promise<{ x: number; y: number } | null> {
  const label = page.locator('button.absolute', { hasText: name }).first();
  const field = label.locator('xpath=ancestor::div[contains(@class,"isolate")][1]');
  const fb = await field.boundingBox();
  const lb = await label.boundingBox();
  if (!fb || !lb) return null;
  // The label sits just under the body; the body is roughly a fifth of the field above it.
  return { x: lb.x + lb.width / 2, y: Math.max(fb.y + 40, lb.y - fb.height * 0.18) };
}

const SCENES: SceneDef[] = [
  {
    n: 1,
    id: 'scene1',
    file: 'scene1-load.mp4',
    seconds: 35,
    run: async (c) => {
      const { page } = c;
      // Landing, then the onboarding link
      await c.goto('/');
      c.focusWide('landing');
      await c.step('landing hover', async () => {
        await c.at(900);
        await c.moveTo(W * 0.3, H * 0.45, 900);
      });
      await c.at(2000);
      await c.step('open onboarding', async () => {
        await c.click(page.getByRole('link', { name: 'Set up your household' }), 'Set up your household');
      });
      await page.waitForURL(/onboarding/, { timeout: 8000 }).catch(() => undefined);
      c.mark('onboarding');
      await c.at(5600);
      // Straight to the Load field
      await c.goto('/load');
      c.mark('load');
      await c.step('field mounts', async () => {
        await page.locator('canvas[role=img]').first().waitFor({ state: 'visible', timeout: 10000 });
      });
      await c.at(10500);
      await c.step('focus Fatima node', async () => {
        const n = await nodeCenter(page, 'Fatima');
        if (!n) throw new Error('no node');
        await c.moveTo(n.x, n.y + 10, 1100);
        c.focusPoint(n.x, n.y, 1.55, 'Fatima ember node');
      });
      await c.at(15000);
      await c.step('open Why', async () => {
        const row = page.locator('ul > li').filter({ hasText: 'Fatima' }).filter({ has: page.getByRole('button', { name: 'Why?' }) });
        await c.click(row.getByRole('button', { name: 'Why?' }), 'Why? (Fatima)');
        await page.getByRole('dialog', { name: 'Where this comes from' }).waitFor({ state: 'visible', timeout: 6000 });
        c.mark('why-open');
        await sleep(500);
        await c.focus(page.getByRole('dialog', { name: 'Where this comes from' }), 1.7, 'Why popover');
      });
      await c.at(26500);
      await c.step('close Why, tour rows', async () => {
        await page.keyboard.press('Escape');
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
        c.focusWide('field');
        for (const name of ['Salem', 'Khalid']) {
          const row = page.locator('ul > li').filter({ hasText: name }).first();
          await c.hover(row, 800);
          await sleep(1100);
        }
      });
      await c.at(31500);
      await c.step('back to Fatima', async () => {
        const n = await nodeCenter(page, 'Fatima');
        if (n) {
          await c.moveTo(n.x, n.y + 10, 900);
          c.focusPoint(n.x, n.y, 1.4, 'Fatima ember node');
        }
      });
    },
  },
  {
    n: 2,
    id: 'scene2',
    file: 'scene2-resilience.mp4',
    seconds: 40,
    run: async (c) => {
      const { page } = c;
      await c.goto('/load');
      await c.step('field mounts', async () => {
        await page.locator('canvas[role=img]').first().waitFor({ state: 'visible', timeout: 10000 });
      });
      c.focusWide('load');
      await c.at(3000);
      await c.step('click Fatima node', async () => {
        const n = await nodeCenter(page, 'Fatima');
        if (!n) throw new Error('no node');
        c.focusPoint(n.x, n.y, 1.45, 'Fatima node');
        await c.clickAt(n.x, n.y + 10, 'Fatima node', 1000);
      });
      await c.at(5200);
      await c.step('to resilience', async () => {
        c.focusWide('resilience');
        await c.scrollTo(page.locator('#resilience-title'), 1500, 120);
      });
      await c.at(7200);
      await c.step('run stress test', async () => {
        const run = page.getByRole('button', { name: /Run the stress test|Run again/ });
        await c.click(run, 'Run the stress test (14 days)');
        await page.waitForResponse((r) => r.url().includes('/api/resilience'), { timeout: 8000 }).catch(() => undefined);
        c.mark('stress-test');
      });
      await c.at(9500);
      await c.step('scroll results', async () => {
        await c.scrollTo(page.getByText(/EpiPen/i).first(), 1800, 330);
      });
      await c.at(11800);
      await c.step('focus EpiPen', async () => {
        await c.focus(page.getByText(/EpiPen/i).first(), 1.6, 'EpiPen single point of failure');
      });
      await c.at(15500);
      await c.step('focus Aisha dose', async () => {
        const dose = page.getByText(/Aisha.*(weekly|dose)|(weekly|dose).*Aisha/i).first();
        await c.scrollTo(dose, 1200, 360);
        await c.focus(dose, 1.6, 'Aisha weekly dose');
      });
      await c.at(19500);
      await c.step('draft plan', async () => {
        const draft = page.getByRole('button', { name: 'Draft the handover plan' });
        await c.scrollTo(draft, 1400, 420);
        c.focusWide('plan');
        await sleep(300);
        await c.click(draft, 'Draft the handover plan');
        await page.waitForResponse((r) => r.url().includes('/api/resilience'), { timeout: 8000 }).catch(() => undefined);
        c.mark('plan-drafted');
      });
      await c.at(24000);
      await c.step('show plan', async () => {
        await c.scrollTo(page.getByRole('heading', { name: 'A handover plan' }), 1400, 160);
      });
      await c.at(27000);
      await c.step('back to top', async () => {
        await c.scrollToTop(1300);
        c.focusWide('top');
      });
      await c.at(28800);
      await c.step('view as Salem', async () => {
        await c.viewAs('Salem');
        c.mark('viewing-as-salem');
      });
      await c.at(32200);
      await c.step('accept handoff', async () => {
        const inbox = page.locator('#handoff-inbox-title');
        await inbox.waitFor({ state: 'visible', timeout: 8000 });
        await c.scrollTo(inbox, 1000, 120);
        await sleep(300);
        const accept = page.getByRole('button', { name: 'Accept' }).first();
        await c.focus(accept, 1.5, 'Accept in the inbox');
        await sleep(600);
        await c.click(accept, 'Accept');
        c.mark('accepted');
      });
      await c.at(36000);
      await c.step('after accepting', async () => {
        c.focusWide('after');
        await c.scrollTo(page.locator('#resilience-title'), 1500, 120);
      });
    },
  },
  {
    n: 3,
    id: 'scene3',
    file: 'scene3-operations.mp4',
    seconds: 45,
    run: async (c) => {
      const { page } = c;
      await c.goto('/operations');
      await c.step('inbox visible', async () => {
        await page.locator('h2', { hasText: 'Drop anything' }).waitFor({ state: 'visible', timeout: 10000 });
      });
      c.focusWide('operations');
      await c.at(2500);
      await c.step('pause on inbox', async () => {
        const drop = page.locator('section').filter({ has: page.locator('h2', { hasText: 'Drop anything' }) });
        await c.focus(drop, 1.35, 'Drop anything inbox');
        await c.hover(drop, 1200);
      });
      await c.at(9000);
      await c.step('scroll to conflicts', async () => {
        c.focusWide('scrolling');
        await c.scrollTo(page.locator('#conflicts-title'), 2600, 170);
      });
      await c.at(13000);
      await c.step('focus conflict', async () => {
        await c.focus(page.locator('#conflicts-title').locator('xpath=ancestor::section[1]'), 1.35, 'Calendar conflicts', 60);
      });
      await c.at(21000);
      await c.step('dust season badge', async () => {
        c.focusWide('badge');
        const badge = page.getByRole('button', { name: 'Dust Season' });
        await c.click(badge, 'Dust Season badge', 1100);
        await page.getByRole('dialog', { name: 'Dust Season' }).waitFor({ state: 'visible', timeout: 4000 });
        await sleep(400);
        await c.focus(page.getByRole('dialog', { name: 'Dust Season' }), 1.6, 'Dust season note');
      });
      await c.at(28500);
      await c.step('close badge', async () => {
        await page.keyboard.press('Escape');
        c.focusWide('wide');
      });
      await c.at(29500);
      await c.step('scroll to meal plan', async () => {
        await c.scrollTo(page.locator('#meals-title'), 2200, 130);
      });
      await c.at(33000);
      await c.step('focus meal grid', async () => {
        const grid = page.locator('#meals-title').locator('xpath=ancestor::section[1]');
        await c.focus(grid, 1.25, '7-day meal plan', 120);
        const cells = grid.locator('button');
        const count = await cells.count();
        for (const i of [1, Math.min(4, count - 1), Math.min(8, count - 1)]) {
          await c.hover(cells.nth(i), 900);
          await sleep(1400);
        }
      });
    },
  },
  {
    n: 4,
    id: 'scene4',
    file: 'scene4-health.mp4',
    seconds: 30,
    run: async (c) => {
      const { page } = c;
      await c.goto('/health');
      await c.step('health loads', async () => {
        await page.locator('#people-title').waitFor({ state: 'visible', timeout: 10000 });
      });
      c.focusWide('health');
      await c.at(3000);
      await c.step('status words', async () => {
        await c.scrollTo(page.locator('#people-title'), 1400, 140);
        await c.focus(page.locator('#people-title').locator('xpath=ancestor::section[1]'), 1.2, 'Everyone: status words', 120);
      });
      await c.at(8500);
      await c.step('appointments', async () => {
        await c.scrollTo(page.locator('#appts-title'), 1700, 140);
        await c.focus(page.locator('#appts-title').locator('xpath=ancestor::section[1]'), 1.25, 'Escort appointments', 120);
      });
      await c.at(14000);
      await c.step('lab patterns', async () => {
        await c.scrollTo(page.locator('#patterns-title'), 1700, 140);
        await c.focus(page.locator('#patterns-title').locator('xpath=ancestor::section[1]'), 1.25, 'Family patterns', 120);
      });
      await c.at(19000);
      await c.step('open System pill', async () => {
        c.focusWide('system');
        const pill = page.getByRole('button', { name: /^(Demo|Live|Working|Preview|Ready)$/ });
        await c.click(pill, 'System pill', 1100);
        await page.getByRole('dialog', { name: 'System status' }).waitFor({ state: 'visible', timeout: 4000 });
        await sleep(500);
        await c.focus(page.getByRole('dialog', { name: 'System status' }), 1.5, 'System popover');
      });
      await c.at(22500);
      await c.step('vault ON', async () => {
        const toggle = page.getByRole('dialog', { name: 'System status' }).getByRole('button', { name: 'Use local vault' });
        await c.click(toggle, 'Privacy Vault ON', 900);
        c.mark('vault-on');
        await page.getByText('Local vault active').waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
      });
    },
  },
  {
    n: 5,
    id: 'scene5',
    file: 'scene5-briefing.mp4',
    seconds: 30,
    run: async (c) => {
      const { page } = c;
      await c.goto('/briefing');
      await c.step('briefing loads', async () => {
        await page.locator('#priority-title').waitFor({ state: 'visible', timeout: 12000 });
      });
      c.focusWide('briefing');
      await c.at(4200);
      await c.step('view as Khalid', async () => {
        await c.viewAs('Khalid');
        c.mark('khalid');
      });
      await c.at(10200);
      await c.step('view as Aisha', async () => {
        await c.viewAs('Aisha');
        c.mark('aisha');
      });
      await c.at(16200);
      await c.step('scroll to micro-actions', async () => {
        await c.scrollTo(page.locator('#together-title'), 2400, 160);
        await c.focus(page.locator('#together-title').locator('xpath=ancestor::section[1]'), 1.2, 'Micro-actions', 80);
      });
      await c.at(21000);
      await c.step('memory vault and time dividend', async () => {
        await c.scrollTo(page.locator('#timeback-title'), 2200, 150);
        await c.focus(page.locator('#timeback-title').locator('xpath=ancestor::section[1]'), 1.3, 'Time dividend hero', 100);
      });
    },
  },
];

// ── Plumbing ─────────────────────────────────────────────────────────────────────────────────────
function reseed() {
  if (process.env.NO_RESEED) return;
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be set to the demo server\'s scratch database');
  execFileSync('npx', ['tsx', 'lib/data/seed.ts'], { cwd: ROOT, env: process.env, stdio: 'pipe', shell: true });
}

async function warmUp(browser: Browser, routes: string[]) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  for (const r of routes) {
    await page.goto(`${BASE_URL}${r}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => undefined);
    await sleep(1500);
  }
  await ctx.close();
}

async function ensureVaultOff() {
  const get = await fetch(`${BASE_URL}/api/privacy/status`, { cache: 'no-store' }).then((r) => r.json());
  if (get.enabled) await fetch(`${BASE_URL}/api/privacy/status`, { method: 'POST' });
}

function startOllamaStub(): Promise<Server | null> {
  return new Promise((resolve) => {
    fetch('http://127.0.0.1:11434/api/version', { signal: AbortSignal.timeout(1500) })
      .then(() => resolve(null)) // a real Ollama is running; leave it alone
      .catch(() => {
        const srv = createServer((_req, res) => {
          res.setHeader('content-type', 'application/json');
          res.end('{"version":"0.0.0-capture-stub"}');
        });
        srv.once('error', () => resolve(null));
        srv.listen(11434, '127.0.0.1', () => {
          console.log('  (no Ollama found: serving a stub on :11434 so the vault reads "active" in scene 4)');
          resolve(srv);
        });
      });
  });
}

function toMp4(webm: string, mp4: string, seconds: number) {
  execFileSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-i', webm, '-t', String(seconds), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', mp4],
    { stdio: 'inherit' },
  );
}

async function main() {
  const wanted = process.argv.slice(2).map(Number).filter(Boolean);
  const defs = SCENES.filter((s) => wanted.length === 0 || wanted.includes(s.n));
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(TIMELINE_PATH), { recursive: true });

  const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!res?.ok) throw new Error(`Bayt is not answering at ${BASE_URL}. Start it with NEXT_PUBLIC_DEMO_MODE=true first.`);

  const stub = process.env.NO_OLLAMA_STUB ? null : await startOllamaStub();
  const existing: Record<string, SceneTimeline> = fs.existsSync(TIMELINE_PATH)
    ? Object.fromEntries((JSON.parse(fs.readFileSync(TIMELINE_PATH, 'utf8')).scenes as SceneTimeline[]).map((s) => [s.id, s]))
    : {};

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', `--window-size=${W},${H}`],
  });

  try {
    for (const def of defs) {
      console.log(`\nScene ${def.n}: ${def.file} (${def.seconds}s)`);
      reseed();
      if (def.n === 4) await ensureVaultOff();
      const route = { 1: ['/', '/onboarding', '/load'], 2: ['/load'], 3: ['/operations'], 4: ['/health'], 5: ['/briefing'] }[def.n]!;
      await warmUp(browser, route);

      const context: BrowserContext = await browser.newContext({
        viewport: { width: W, height: H },
        deviceScaleFactor: 1,
        recordVideo: { dir: RAW_DIR, size: { width: W, height: H } },
      });
      // tsx compiles with keepNames, which injects a __name() helper into functions sent to the page.
      await context.addInitScript('window.__name = (f) => f;');
      const page = await context.newPage();
      const ctx = new Ctx(page, def);
      const video = page.video()!;
      try {
        await def.run(ctx);
        await ctx.at(def.seconds * 1000 + TAIL_MS);
      } finally {
        await context.close();
      }
      const webm = path.join(RAW_DIR, `${def.id}.webm`);
      await video.saveAs(webm);
      toMp4(webm, path.join(OUT_DIR, def.file), def.seconds);
      existing[def.id] = ctx.tl;
      fs.writeFileSync(TIMELINE_PATH, JSON.stringify({ fps: FPS, width: W, height: H, scenes: SCENES.map((s) => existing[s.id]).filter(Boolean) }, null, 2));
      console.log(`  ok: ${ctx.tl.clicks.length} clicks, ${ctx.tl.focus.length} focus points${ctx.tl.skipped.length ? `, SKIPPED: ${ctx.tl.skipped.join(', ')}` : ''}`);
    }
  } finally {
    await browser.close();
    stub?.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
