import { openBrowser, ensureBrowser } from "@remotion/renderer";
import { readFileSync, writeFileSync } from "node:fs";

const dir = process.argv[2];
await ensureBrowser();
const browser = await openBrowser("chrome", { logLevel: "error" });
const page = await browser.newPage({ logLevel: "error", indent: false, pageIndex: 0 });
await page.setViewport({ width: 1656, height: 552, deviceScaleFactor: 1 });

const svg = readFileSync(`${dir}/chart.svg`, "utf8");
const b64 = Buffer.from(svg).toString("base64");

// Two ways a composition could carry it: as an <img> (secure static mode, uncontrollable)
// and inlined into the DOM (stylable, animatable).
for (const [name, body] of [
  [
    "img",
    `<img style="width:100%;height:100%;object-fit:contain;display:block" src="data:image/svg+xml;base64,${b64}">`,
  ],
  [
    "inline",
    svg.replace(
      "<svg ",
      '<svg style="width:100%;height:100%" preserveAspectRatio="xMidYMid meet" ',
    ),
  ],
]) {
  await page.goto({
    url:
      "data:text/html," +
      encodeURIComponent(`<body style="margin:0;background:#0A0D12">${body}</body>`),
    timeoutInMilliseconds: 30000,
  });
  const shot = await page.screenshot({ type: "png" });
  writeFileSync(`${dir}/chromium-${name}.png`, shot);
  console.log(name, "->", shot.length, "bytes");
}
await browser.close({ silent: true });
