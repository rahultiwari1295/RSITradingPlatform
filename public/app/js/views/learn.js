import { icon, words } from '../app.js';
import { lessonRow } from './home.js';

/* Drawn teaching charts: made-up prices, labelled as such. */
const path = (v, W = 320, H = 120, lo = Math.min(...v), hi = Math.max(...v)) => v.map((y, i) => `${i ? 'L' : 'M'}${(i / (v.length - 1) * (W - 8) + 4).toFixed(1)} ${((1 - (y - lo) / ((hi - lo) || 1)) * (H - 16) + 8).toFixed(1)}`).join(' ');
const walk = (n, seed, drift, vol, start = 100) => { let s = seed, p = start; const o = []; for (let i = 0; i < n; i++) { s = (s * 9301 + 49297) % 233280; p *= 1 + drift + (s / 233280 - .5) * vol; o.push(p); } return o; };
const sma = (v, k) => v.map((_, i) => i < k - 1 ? null : v.slice(i - k + 1, i + 1).reduce((a, b) => a + b, 0) / k);
function fig(series, cap, extra = '') {
  const all = series.flatMap(s => s.v.filter(x => x != null)), lo = Math.min(...all), hi = Math.max(...all);
  const lines = series.map(s => { const first = s.v.findIndex(x => x != null); const v = s.v.slice(first); const off = first / (s.v.length - 1) * 312; return `<path transform="translate(${off.toFixed(1)} 0) scale(${((s.v.length - 1 - first) / (s.v.length - 1)).toFixed(3)} 1)" d="${path(v, 320, 120, lo, hi)}" fill="none" stroke="${s.c}" stroke-width="${s.w || 2}" ${s.dash ? 'stroke-dasharray="4 4"' : ''} vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>`; }).join('');
  return `<div class="figure"><svg viewBox="0 0 320 120" aria-hidden="true">${extra}${lines}</svg><div class="cap">${cap} Drawn example, not real prices.</div></div>`;
}
const P1 = walk(90, 7, .004, .035), P2 = walk(90, 11, -.0015, .03), P3 = [...walk(50, 5, .0005, .012, 100), ...walk(40, 9, .009, .03, 101)];
const RSI = [52, 48, 41, 36, 31, 27, 24, 29, 35, 42, 49, 55, 61, 66, 72, 75, 71, 64, 58, 54, 50, 47, 44, 49, 56];

export const LESSONS = [
  { id: 'rules', title: 'What is a rule-based strategy?', sub: 'The idea behind everything here', icon: 'layers', color: '#5B6CFF', mins: 2, try: '52w-high',
    body: `<p>A <b>rule-based strategy</b> is a short list of conditions a stock must meet, written so clearly that a computer can check them. “The price closes above its 52-week high, on at least 1.5 times its normal volume” is a rule. “It looks strong” is not.</p>
      <p>Clear rules let you do two things a hunch never can: <b>check every stock</b> in the market in seconds, and <b>test the idea on years of past prices</b> to see how often it held up.</p>
      <div class="callout"><b>The point is not to find a magic rule.</b> It is to replace guesses with something you can measure, question and improve.</div>
      <p>In QuantSync Lab you describe an idea in words, the builder turns it into rules, and you decide what to keep.</p>` },
  { id: 'averages', title: 'Moving averages and trend', sub: 'Is the stock going up or down?', icon: 'wave', color: '#0E9F8A', mins: 3, try: 'golden-cross',
    body: () => `<p>A <b>moving average</b> is the average closing price over the last N days, recalculated every day. It smooths out the daily noise so the direction is easier to see.</p>
      ${fig([{ v: P1, c: 'var(--ink-3)', w: 1.5 }, { v: sma(P1, 20), c: 'var(--brand)', w: 2.4 }], 'Price (grey) and its 20-day average (blue).')}
      <p>When the price stays above a rising average, the trend is up. The <b>200-day average</b> is the one most people use for the long-term trend; the <b>20 or 50-day</b> ones react faster.</p>
      <p>A <b>crossover</b> is when a faster average moves above a slower one, such as the 50-day crossing above the 200-day (the “golden cross”). It shows a change of direction, but always after the move has started.</p>` },
  { id: 'rsi', title: 'RSI: how stretched is a move?', sub: 'Momentum on a 0 to 100 scale', icon: 'bars', color: '#E0A030', mins: 3, try: 'pullback',
    body: () => `<p><b>RSI</b> (Relative Strength Index) compares the size of recent up days with recent down days and puts the result on a scale from 0 to 100.</p>
      ${fig([{ v: RSI, c: '#E0A030', w: 2.4 }], 'RSI moving between stretched-down (below 30) and stretched-up (above 70).', `<rect x="0" y="0" width="320" height="34" fill="var(--dn-soft)" opacity=".7"/><rect x="0" y="86" width="320" height="34" fill="var(--up-soft)" opacity=".7"/>`)}
      <p>Above 70, a stock has risen fast and is often called <b>overbought</b>; below 30, it has fallen fast and is called <b>oversold</b>. Neither means it must turn. Strong stocks can stay above 70 for weeks.</p>
      <p>Many rules use RSI as a filter, for example “in an uptrend, but RSI has cooled to 35 to 45”.</p>` },
  { id: 'breakouts', title: 'Breakouts and volume', sub: 'When a stock leaves its range', icon: 'trend', color: '#7B55F0', mins: 3, try: 'momentum-breakouts',
    body: () => `<p>A <b>breakout</b> is a close above a price level that capped the stock before, such as the high of the last 20 days or 52 weeks.</p>
      ${fig([{ v: P3, c: 'var(--brand)', w: 2.4 }], 'A quiet range, then a close above its top (dashed).', `<path d="M4 64H316" stroke="var(--ink-3)" stroke-dasharray="4 4"/>`)}
      <p><b>Volume</b> tells you how many shares changed hands. A breakout on two or three times the usual volume shows real demand. A breakout on thin volume is easier to reverse.</p>
      <div class="callout"><b>Most breakouts fail</b> in weak markets. That is why testing them with a clear exit matters more than finding them.</div>` },
  { id: 'exits', title: 'Exits matter more than entries', sub: 'Loss limit, gain limit and time', icon: 'shield', color: '#D3313A', mins: 3, try: 'pullback',
    body: `<p>Every test needs a rule for when a match <b>leaves</b>. Without one, there is no result to measure. The builder offers three:</p>
      <p><b>Falls by X%</b>: the match leaves if the price drops that far from where it matched. It caps how much one bad match can cost in the test.</p>
      <p><b>Rises by Y%</b>: it leaves after gaining that much. A higher number lets winners run longer but more of them fade before reaching it.</p>
      <p><b>After N days</b>: it leaves after a fixed time, so money is not stuck in a stock that does nothing.</p>
      <div class="callout">Try the same entry rules with three different exit settings. You will often see bigger differences from the exit than from the entry.</div>` },
  { id: 'honest-tests', title: 'How to read a test honestly', sub: 'Avoid fooling yourself', icon: 'info', color: '#0A8AC8', mins: 4, try: 'golden-cross',
    body: `<p>A past test is useful, and easy to misread. Four checks before you trust one:</p>
      <p><b>1. Enough matches.</b> Under about 30, a few lucky trades can make anything look good.</p>
      <p><b>2. Every year, not just the total.</b> If one year made all the gains, the rule may only work in one kind of market.</p>
      <p><b>3. Costs.</b> Our tests include 0.10% each way. Rules that trade very often feel costs the most.</p>
      <p><b>4. Over-fitting.</b> If you keep adding rules until the past looks perfect, you have described the past, not found an edge. Simple rules that hold up across years are more believable.</p>
      <div class="callout"><b>A test is not a forecast.</b> Markets change. Treat results as evidence about your idea, not a promise.</div>` },
  { id: 'ai-coach', title: 'How the AI coach works', sub: 'What it does, and what it does not', icon: 'spark', color: '#5B6CFF', mins: 3, try: 'momentum-breakouts',
    body: `<p>When you save a strategy, the <b>AI coach</b> can study every past match of your rules. It learns from features of each match (trend, momentum, volume, volatility) which ones tended to end higher.</p>
      <p>It is trained only on <b>earlier years</b> and judged on later years it never saw, so it cannot peek at the answers. This is called walk-forward testing.</p>
      <p>If it finds a filter that keeps the stronger matches and holds up across years, it shows you both versions side by side. <b>You choose</b> whether to use it. Often it finds nothing reliable, and it says so.</p>
      <div class="callout"><b>The coach improves your rules; it does not pick stocks for you.</b> It only ever filters the matches your own rules produce.</div>` },
];

export default async function learn(el) {
  el.innerHTML = `
  <div class="head"><span class="ey">${icon('learn', 16)}Learn</span><h1 class="h1">${words('Learn the <em>ideas</em> behind the rules.')}</h1>
    <p class="lede">Short lessons with drawn examples. Each one ends with a rule you can try in the builder.</p></div>
  <div class="list" style="margin-top:18px">${LESSONS.map(lessonRow).join('')}</div>`;
}
