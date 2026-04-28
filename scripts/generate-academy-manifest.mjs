import { readdirSync, existsSync, statSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "public");
const SLIDE_RE = /^slide-(\d+)\.(jpe?g|png)$/i;

const FOLDERS = [
  "zone/Trading_Survival_Architecture",
  "Candlestick_Mastery.",
  "Tactical_Candlestick_Analysis",
  "Candlestick_Reversal_Anatomy",
  "The_Trader_s_Blueprint",
  "The_Probability_Blueprint",
  "Mind_Architecture",
  "Tactical_Trading_Playbook",
  "Market_Engine_Blueprint",
  "Market_Microstructure_Architecture",
  "Market_Microstructure_Blueprint",
  "Smart_Money_Protocol",
  "The_Volume_Compass",
  "Whale_Hunting",
  "Liquidity_Trap_Mastery",
  "zone/Trend_Anatomy",
  "zone/Magic_zones",
  "zone/Important_about_volume",
  "zone/RSI_Market_Pulse",
  "zone/Anatomy_of_a_candle",
];

const manifest = {};

for (const folder of FOLDERS) {
  const abs = join(publicDir, folder);
  if (!existsSync(abs) || !statSync(abs).isDirectory()) {
    manifest[folder] = [];
    continue;
  }
  const names = readdirSync(abs);
  const slides = names
    .filter((n) => SLIDE_RE.test(n))
    .sort((a, b) => {
      const na = Number(a.match(SLIDE_RE)?.[1] ?? 0);
      const nb = Number(b.match(SLIDE_RE)?.[1] ?? 0);
      return na - nb;
    })
    .map((n) => `/${folder}/${n}`);
  manifest[folder] = slides;
}

const out = join(root, "lib", "academy", "manifest.json");
writeFileSync(out, JSON.stringify(manifest, null, 2));
console.log(`Academy manifest written: ${Object.keys(manifest).length} folders`);
