// Suma los lenguajes de todos los repositorios públicos (sin forks ni archivados)
// y dibuja una barra con los porcentajes en lenguajes.svg, como la de cada repo.
import { writeFileSync } from "node:fs";

const USER = "ZaperMaster";
const SKIP = new Set([USER.toLowerCase()]); // El README de perfil no cuenta
const MAX = 8; // Los demás se juntan en «Otros»
const COLORS = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", Java: "#b07219", "C#": "#178600",
  Rust: "#dea584", HTML: "#e34c26", CSS: "#663399", ShaderLab: "#222c37", HLSL: "#aace60", Batchfile: "#C1F12E",
  Shell: "#89e051", SQL: "#e38c00", Otros: "#8b949e",
};

const headers = { Accept: "application/vnd.github+json", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
const get = async (url) => {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

const repos = (await get(`https://api.github.com/users/${USER}/repos?type=owner&per_page=100`)).filter(
  (r) => !r.fork && !r.archived && !r.private && !SKIP.has(r.name.toLowerCase()),
);
const totals = {};
for (const r of repos) for (const [lang, bytes] of Object.entries(await get(r.languages_url))) totals[lang] = (totals[lang] ?? 0) + bytes;

const sum = Object.values(totals).reduce((a, b) => a + b, 0);
if (!sum) throw new Error("No hay lenguajes");
let list = Object.entries(totals).sort((a, b) => b[1] - a[1]);
if (list.length > MAX) list = [...list.slice(0, MAX - 1), ["Otros", list.slice(MAX - 1).reduce((a, [, b]) => a + b, 0)]];
const items = list.map(([name, bytes]) => ({ name, pct: (bytes / sum) * 100, color: COLORS[name] ?? "#8b949e" }));

// Barra arriba y leyenda en 4 columnas debajo
const W = 820;
const BAR_Y = 10;
const BAR_H = 12;
let x = 0;
const segments = items
  .map((it) => {
    const w = (it.pct / 100) * W;
    const s = `<rect x="${x.toFixed(2)}" y="${BAR_Y}" width="${w.toFixed(2)}" height="${BAR_H}" fill="${it.color}"/>`;
    x += w;
    return s;
  })
  .join("");
const COLS = 4;
const legend = items
  .map((it, i) => {
    const cx = (i % COLS) * (W / COLS);
    const cy = 48 + Math.floor(i / COLS) * 26;
    const pct = it.pct.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return `<circle cx="${cx + 6}" cy="${cy - 4}" r="5" fill="${it.color}"/><text x="${cx + 18}" y="${cy}"><tspan class="n">${it.name}</tspan> <tspan class="p">${pct} %</tspan></text>`;
  })
  .join("");
const H = 48 + Math.ceil(items.length / COLS) * 26 - 8;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Lenguajes de mis repositorios públicos">
<style>text{font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}.n{font-weight:600;fill:#7d8590}.p{fill:#8b949e}</style>
<clipPath id="r"><rect x="0" y="${BAR_Y}" width="${W}" height="${BAR_H}" rx="6"/></clipPath>
<g clip-path="url(#r)">${segments}</g>
${legend}
</svg>
`;
writeFileSync("lenguajes.svg", svg);
console.log(items.map((it) => `${it.name} ${it.pct.toFixed(1)}%`).join(" · "));
