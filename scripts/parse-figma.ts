import { readFileSync } from "fs";

const d = JSON.parse(
  readFileSync(
    "C:/Users/iggyn/.claude/projects/d--Kalyxi-AI-Powered-Sales-Call-Analysis-Platform/bf78b1c0-16a8-4e18-9faf-7e370b39a9c1/tool-results/mcp-claude_ai_Figma-get_metadata-1770989575852.txt",
    "utf8"
  )
);

const xml = d[0].text;

// Find all sections (top-level containers)
const sectionRe = /<section\s+id="([^"]+)"\s+name="([^"]+)"/g;
let match;
console.log("=== SECTIONS ===");
while ((match = sectionRe.exec(xml)) !== null) {
  console.log(`${match[1]} - ${match[2]}`);
}

// Find top-level frames (direct children of canvas)
const canvasContent = xml.replace(/<canvas[^>]*>/, "").replace(/<\/canvas>/, "");
const topFrameRe = /^[\s]*<(?:frame|section)\s+id="([^"]+)"\s+name="([^"]+)"/gm;
while ((match = topFrameRe.exec(canvasContent)) !== null) {
  console.log(`TOP: ${match[1]} - ${match[2]}`);
}

// Simpler: just find all elements with large dimensions (likely main screens)
const allRe = /<(\w+)\s+id="([^"]+)"\s+name="([^"]+)"[^>]*width="([^"]+)"[^>]*height="([^"]+)"/g;
console.log("\n=== LARGE ELEMENTS (w>500 or h>500) ===");
while ((match = allRe.exec(xml)) !== null) {
  const w = parseFloat(match[4]);
  const h = parseFloat(match[5]);
  if (w > 500 || h > 500) {
    console.log(`${match[1]} id=${match[2]} name="${match[3]}" ${w}x${h}`);
  }
}
