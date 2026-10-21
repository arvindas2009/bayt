/**
 * Export the main screens of the live Bayt app, in dark (default) or light mode, as PNG screenshots and SVGs:
 * /briefing, /load, /operations (every tab), /health, plus the menus and popovers their buttons open.
 *
 *   npx tsx scripts/export-screens.ts            # everything
 *   npx tsx scripts/export-screens.ts load       # only states whose id contains "load"
 *
 * Environment
 *   BASE_URL  default http://localhost:3000. Prefer a server started with NEXT_PUBLIC_DEMO_MODE=true.
 *   WIDTH     viewport width, default 1440.
 *   THEME     dark (default, writes exports/) or light (writes exports/light/).
 *   SET       app (default) or extras: the Ask Bayt chat, landing page and /login, written to
 *             exports/chat-landing-login/<theme>/. The chat sends one real question to /api/chat.
 *
 * Output (under exports/)
 *   png/<page>/<state>.png   full-page screenshot (WebGL included)
 *   svg/<page>/<state>.svg   vector: Chromium prints the page to PDF, PyMuPDF writes the SVG with
 *                            text as outlines, so the fonts survive in any viewer. WebGL canvases are
 *                            embedded as images. Needs `pip install pymupdf`.
 *
 * Read-only: it only navigates and opens tabs, menus and popovers. It never clicks a button that
 * saves, drafts, accepts, regenerates or pins something.
 */
import { chromium, type Page } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const WIDTH = Number(process.env.WIDTH ?? 1440);
const VIEW_H = 900;
const ROOT = path.resolve(__dirname, '..');
const THEME = process.env.THEME === 'light' ? 'light' : 'dark';
// Dark stays in exports/, light goes to exports/light/ so the two sets never overwrite each other.
// SET=extras exports the Ask Bayt chat, the landing page and /login into their own folder instead.
const SET = process.env.SET === 'extras' ? 'extras' : 'app';
const OUT =
  SET === 'extras'
    ? path.join(ROOT, 'exports', 'chat-landing-login', THEME)
    : THEME === 'dark' ? path.join(ROOT, 'exports') : path.join(ROOT, 'exports', 'light');
const TMP = path.join(OUT, '_pdf');

interface State {
  /** page/state, also the output path. */
  id: string
  route: string
  /** Scroll the whole page into one tall image (true) or capture just the viewport (menus, popovers). */
  full: boolean
  steps?: (p: Page) => Promise<void>
}

const click = (name: string | RegExp, role: 'button' | 'tab' = 'button') => async (p: Page) => {
  await p.getByRole(role, { name, exact: typeof name === 'string' }).first().click({ timeout: 5000 });
  await p.waitForTimeout(900);
};
const then = (...fns: Array<(p: Page) => Promise<void>>) => async (p: Page) => { for (const f of fns) await f(p); };

const SYSTEM_PILL = /^(Live|Preview|Demo|Working|Ready)$/;

const STATES: State[] = [
  // Briefing
  { id: 'briefing/01-page', route: '/briefing', full: true },
  { id: 'briefing/02-menu-new', route: '/briefing', full: false, steps: click('New') },
  { id: 'briefing/03-menu-viewing-as', route: '/briefing', full: false, steps: click(/Viewing as/) },
  { id: 'briefing/04-popover-system', route: '/briefing', full: false, steps: click(SYSTEM_PILL) },
  { id: 'briefing/05-popover-why', route: '/briefing', full: true, steps: click('Why?') },
  { id: 'briefing/06-menu-pin-add', route: '/briefing', full: false, steps: click('Add') },
  { id: 'briefing/07-how-this-is-counted', route: '/briefing', full: true, steps: click('How this is counted') },
  { id: 'briefing/08-capture-a-memory', route: '/briefing', full: true, steps: click('Capture a memory') },

  // Load, and the three Resilience Mode result tabs after a stress test
  { id: 'load/01-page', route: '/load', full: true },
  { id: 'load/02-popover-why', route: '/load', full: true, steps: click('Why?') },
  { id: 'load/03-stress-test-unravels', route: '/load', full: true, steps: then(click('Run the stress test'), click(/^How it unravels/, 'tab')) },
  { id: 'load/04-stress-test-fragile-spots', route: '/load', full: true, steps: then(click('Run the stress test'), click(/^Fragile spots/, 'tab')) },
  { id: 'load/05-stress-test-who-steps-in', route: '/load', full: true, steps: then(click('Run the stress test'), click(/^Who steps in/, 'tab')) },

  // Operations, one state per tab
  { id: 'operations/01-calendar', route: '/operations', full: true, steps: click(/^Calendar/, 'tab') },
  { id: 'operations/02-meals', route: '/operations', full: true, steps: click(/^Meals/, 'tab') },
  { id: 'operations/03-drop-anything', route: '/operations', full: true, steps: click(/^Drop anything/, 'tab') },
  { id: 'operations/04-school', route: '/operations', full: true, steps: click(/^School/, 'tab') },
  { id: 'operations/05-modal-add-event', route: '/operations', full: false, steps: click('Add event') },
  { id: 'operations/06-popover-why', route: '/operations', full: true, steps: click('Why?') },

  // Health
  { id: 'health/01-appointments', route: '/health', full: true, steps: click(/^Next \d+ days/, 'tab') },
  { id: 'health/02-medications', route: '/health', full: true, steps: click(/^Medications/, 'tab') },
  { id: 'health/03-family-patterns', route: '/health', full: true, steps: click(/^Family patterns/, 'tab') },
];

const MEMBERS = ['salem', 'fatima', 'layla', 'khalid', 'aisha'];

// The Briefing's "Ask Bayt" box. The sample question is one of its own suggestion chips, so it is
// something a person would really ask, and the answer shows Resilience Mode's facts in words.
const SAMPLE_PROMPT = 'What happens if I am away for two weeks?';
const CHAT_INPUT = '#ask-bayt-input';

const typeSample = async (p: Page) => {
  await p.locator(CHAT_INPUT).click();
  await p.locator(CHAT_INPUT).fill(SAMPLE_PROMPT);
  await p.waitForTimeout(700);
};

/** Send the sample question and wait until the answer has stopped changing (the model call can take a while). */
const askSample = async (p: Page) => {
  await typeSample(p);
  await p.keyboard.press('Enter');
  await p.locator('[role="log"]').waitFor({ timeout: 10000 });
  let last = '';
  let same = 0;
  for (let i = 0; i < 70 && same < 4; i++) {
    await p.waitForTimeout(1000);
    const text = await p.locator('[role="log"]').innerText();
    same = text === last && text.length > SAMPLE_PROMPT.length + 60 ? same + 1 : 0;
    last = text;
  }
  if (same < 4) throw new Error('the answer never settled');
  // The chat falls back to plain facts when the model is rate-limited; the export wants the AI answer.
  if (last.includes('AI unavailable')) throw new Error('model unavailable');
  await p.waitForTimeout(1500);
};

const EXTRAS: State[] = [
  { id: 'chat/01-collapsed', route: '/briefing', full: false },
  { id: 'chat/02-focused-suggestions', route: '/briefing', full: false, steps: async (p) => { await p.locator(CHAT_INPUT).click(); await p.waitForTimeout(900); } },
  { id: 'chat/03-sample-prompt-typed', route: '/briefing', full: false, steps: typeSample },
  { id: 'chat/04-answer', route: '/briefing', full: false, steps: askSample },
  { id: 'chat/05-answer-why-popover', route: '/briefing', full: false, steps: async (p) => { await askSample(p); await p.locator('[role="log"]').getByRole('button', { name: 'Why?' }).first().click(); await p.waitForTimeout(900); } },
  // Esc shrinks the panel back to the box; the conversation is kept, shown as an answer count beside the field.
  { id: 'chat/06-collapsed-after-answer', route: '/briefing', full: false, steps: async (p) => { await askSample(p); await p.keyboard.press('Escape'); await p.waitForTimeout(1200); } },
  { id: 'landing/01-page', route: '/', full: true },
  { id: 'login/01-page', route: '/login', full: true },
  { id: 'login/02-card-hover', route: '/login', full: true, steps: async (p) => { await p.getByRole('button', { name: /Continue as Fatima/ }).hover(); await p.waitForTimeout(900); } },
];

async function settle(p: Page) {
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(2500);
  // The page scrolls inside <main>, not the window: walk it once so on-scroll reveals fire.
  await p.evaluate(async () => {
    // The dashboard scrolls inside <main>; the landing page and /login scroll the window.
    const main = document.querySelector('main');
    const scroller = main && main.scrollHeight > main.clientHeight + 4 ? main : null;
    const total = scroller ? scroller.scrollHeight : document.documentElement.scrollHeight;
    for (let y = 0; y < total; y += 400) {
      if (scroller) scroller.scrollTo(0, y); else window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    if (scroller) scroller.scrollTo(0, 0); else window.scrollTo(0, 0);
  });
  await p.waitForTimeout(500);
}

/** <main> is h-screen + overflow-y-auto, so grow the viewport until it fits all the content. */
async function fitViewport(p: Page): Promise<number> {
  // The landing hero is min-h-[100svh]: left alone it grows with the viewport we are growing, forever.
  await p.addStyleTag({ content: '[class*="min-h-[100svh]"]{min-height:' + VIEW_H + 'px!important}' });
  let h = VIEW_H;
  for (let i = 0; i < 3; i++) {
    const need = await p.evaluate(() => {
      const main = document.querySelector('main');
      return Math.max(main?.scrollHeight ?? 0, document.documentElement.scrollHeight);
    });
    if (Math.abs(need - h) < 2) break;
    h = Math.max(VIEW_H, need);
    await p.setViewportSize({ width: WIDTH, height: h });
    await p.waitForTimeout(1200);
  }
  return h;
}

/** Transparent PNG of each visible canvas on its own (page screenshots include WebGL, PDFs do not). */
interface CanvasSnap { png: string; dx: number; dy: number; w: number; h: number }

async function snapshotCanvases(p: Page): Promise<CanvasSnap[]> {
  const vh = p.viewportSize()!.height;
  const vw = p.viewportSize()!.width;
  const boxes = await p.evaluate(({ vw, vh }) =>
    [...document.querySelectorAll('canvas')].map((c, i) => {
      const r = c.getBoundingClientRect();
      c.setAttribute('data-snap', String(i));
      // The part of the canvas that is on screen; a canvas below the fold has nothing to snapshot.
      const x = Math.max(r.x, 0), y = Math.max(r.y, 0);
      const w = Math.min(r.right, vw) - x, h = Math.min(r.bottom, vh) - y;
      return { i, bx: r.x, by: r.y, x, y, w, h, shown: w > 2 && h > 2 && getComputedStyle(c).visibility !== 'hidden' };
    }),
    { vw, vh },
  );
  const out: CanvasSnap[] = [];
  await p.addStyleTag({ content: '*{visibility:hidden!important} html,body{background:transparent!important}' });
  for (const b of boxes) {
    if (!b.shown) { out.push({ png: '', dx: 0, dy: 0, w: 0, h: 0 }); continue; }
    await p.addStyleTag({ content: `canvas[data-snap="${b.i}"]{visibility:visible!important}` }).then(async (tag) => {
      // A full-page-sized canvas at 2x is tens of MB of base64 and makes the PDF fail: use 1x for those.
      const buf = await p.screenshot({ clip: { x: b.x, y: b.y, width: b.w, height: b.h }, omitBackground: true, scale: b.w * b.h > 4_000_000 ? 'css' : 'device' });
      out.push({ png: 'data:image/png;base64,' + buf.toString('base64'), dx: b.x - b.bx, dy: b.y - b.by, w: b.w, h: b.h });
      await tag.evaluate((el) => (el as Element).remove());
    });
  }
  // remove the hiding style (the first style tag we added)
  await p.evaluate(() => {
    for (const s of [...document.querySelectorAll('style')]) if (s.textContent?.startsWith('*{visibility:hidden')) s.remove();
  });
  return out;
}

async function capture(p: Page, s: State, pdfs: Array<[string, string]>) {
  const h = s.full ? await fitViewport(p) : VIEW_H;
  const pngPath = path.join(OUT, 'png', s.id + '.png');
  fs.mkdirSync(path.dirname(pngPath), { recursive: true });
  // Chromium cannot draw an image taller than 16384 device pixels, so very tall pages drop to 1x.
  if (!process.env.NO_PNG) await p.screenshot({ path: pngPath, scale: h * 2 > 16000 ? 'css' : 'device' });

  const canvases = process.env.NO_CANVAS ? [] : await snapshotCanvases(p);
  await p.evaluate((snaps) => {
    snaps.forEach((s, i) => {
      const c = document.querySelector(`canvas[data-snap="${i}"]`);
      if (!c) return;
      if (!s.png) { c.remove(); return; }
      // A div keeps the canvas's own sizing classes; the snapshot is placed at the visible part.
      const box = document.createElement('div');
      box.className = c.className;
      box.setAttribute('style', c.getAttribute('style') ?? '');
      box.style.background = `url(${s.png}) ${s.dx}px ${s.dy}px / ${s.w}px ${s.h}px no-repeat`;
      c.replaceWith(box);
    });
  }, canvases);
  await p.waitForTimeout(400);

  await p.emulateMedia({ media: 'screen' });
  const pdfPath = path.join(TMP, s.id.replace('/', '__') + '.pdf');
  fs.mkdirSync(TMP, { recursive: true });
  const printPdf = () => p.pdf({ width: `${WIDTH}px`, height: `${h}px`, printBackground: true, pageRanges: '1', margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  let pdf: Buffer;
  try {
    pdf = await printPdf();
  } catch (err) {
    // Chromium sometimes fails to stream a very tall page after animations ran: freeze them and retry.
    console.log(`  pdf failed (${(err as Error).message.slice(0, 80)}), retrying with animations frozen (h=${h})`);
    await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
    await p.waitForTimeout(500);
    pdf = await printPdf();
  }
  fs.writeFileSync(pdfPath, pdf);
  const svgPath = path.join(OUT, 'svg', s.id + '.svg');
  fs.mkdirSync(path.dirname(svgPath), { recursive: true });
  pdfs.push([pdfPath, svgPath]);
}

async function main() {
  const filter = process.argv[2]?.toLowerCase();
  const states: State[] = (SET === 'extras'
    ? EXTRAS
    : [
        ...STATES,
        ...MEMBERS.map((m, i): State => ({ id: `health/${String(4 + i).padStart(2, '0')}-member-${m}`, route: `/health/mem_${m}`, full: true })),
      ]
  ).filter((s) => !filter || s.id.includes(filter));

  if (!filter) {
    fs.rmSync(path.join(OUT, 'svg'), { recursive: true, force: true });
    fs.rmSync(path.join(OUT, 'png'), { recursive: true, force: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: WIDTH, height: VIEW_H }, deviceScaleFactor: 2, colorScheme: THEME });
  await context.addInitScript((t) => { try { localStorage.setItem('bayt-theme', t); } catch {} }, THEME);
  const page = await context.newPage();
  // Hide the Next.js dev-mode badge so it is not in the exports.
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = 'nextjs-portal{display:none!important}';
      document.head.appendChild(style);
    });
  });
  const pdfs: Array<[string, string]> = [];

  for (const s of states) {
    process.stdout.write(`${s.id.padEnd(40)} `);
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await page.setViewportSize({ width: WIDTH, height: VIEW_H });
        await page.goto(BASE_URL + s.route, { waitUntil: 'domcontentloaded' });
        await settle(page);
        const theme = await page.evaluate(() => document.documentElement.dataset.theme);
        if (theme !== THEME) throw new Error(`theme is ${theme}, not ${THEME}`);
        await s.steps?.(page);
        await capture(page, s, pdfs);
        console.log(attempt > 1 ? `ok (attempt ${attempt})` : 'ok');
        break;
      } catch (err) {
        const msg = (err as Error).message.split('\n')[0];
        if (msg === 'model unavailable' && attempt < 4) {
          await page.waitForTimeout(20000);
          continue;
        }
        console.log(`SKIPPED: ${msg}`);
        break;
      }
    }
  }
  await browser.close();

  execFileSync('python', ['-I', path.join(__dirname, 'pdf_to_svg.py'), ...pdfs.flat()], { stdio: 'inherit' });
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`\n${pdfs.length} screens written to ${OUT}\\png and ${OUT}\\svg`);
}

main().catch((e) => { console.error(e); process.exit(1); });
