import type { Audition, LayoutCandidate } from "./audition.ts";
import { fitWidth } from "./camera.ts";
import type { MachineLayout } from "./machine.ts";
import { MACHINE } from "./theme.ts";

/**
 * The layout audition, drawn.
 *
 * A score is an argument and a picture is evidence, and this round's brief is explicit that a
 * layout policy elected by a scalar nobody looked at is not a policy that has been chosen. So the
 * audition writes itself out: one panel per candidate, at the canonical overview, with its numbers
 * under it, and the elected one marked.
 *
 * It is a **diagnostic drawing rather than the composition**, and the difference is the point. The
 * composition is React, needs a browser, and spends most of its effort on things this deliberately
 * omits — occupancy, the wake, the traveller, the ledger, the field. What is left is exactly what a
 * layout is responsible for and can be blamed for:
 *
 *     plates        where the states are, and whether any two touch
 *     routes        where the edges go, and how often they cross
 *     labels        where the captions sit, and what they land on
 *
 * Drawn at the size the overview will actually show them, so a label that is unreadable in the
 * panel is unreadable in the film. That is the property that makes this evidence rather than
 * decoration, and it is why the panels are laid out in a fixed grid at the film's own aspect
 * instead of being scaled to fit a page.
 *
 * SVG, and no dependency: this is a few hundred elements of `rect`, `path` and `text`, and reaching
 * for a rendering library to produce them would be the kind of machinery the round refused.
 */

/** How many candidates a sheet shows, best first. */
const PANELS = 8;

export function auditionSheet(
  audition: Audition,
  title: string,
  panels: number = PANELS,
): string {
  const ranked = [...audition.candidates].sort((a, b) => b.score.total - a.score.total);
  const shown: LayoutCandidate[] = [];
  for (const candidate of ranked) {
    if (shown.length >= panels) break;
    // One panel per *distinct geometry*: the grid produces ties in bulk — `tight-tree` and
    // `network-simplex` agree on both example machines, and a measure that changes no label's
    // wrap changes nothing at all — and eight panels of the same picture is not an audition.
    const key = geometryKey(candidate.layout);
    if (shown.some((existing) => geometryKey(existing.layout) === key)) continue;
    shown.push(candidate);
  }
  if (!shown.includes(audition.winner)) shown.push(audition.winner);
  if (
    !shown.some((c) => geometryKey(c.layout) === geometryKey(audition.incumbent.layout))
  ) {
    shown.push(audition.incumbent);
  }

  const columns = 2;
  const rows = Math.ceil(shown.length / columns);
  const panelWidth = 960;
  const panelHeight = Math.round(panelWidth / audition.aspect);
  const caption = 96;
  const gap = 28;
  const header = 96;
  const width = columns * panelWidth + (columns + 1) * gap;
  const height = header + rows * (panelHeight + caption + gap) + gap;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
      `viewBox="0 0 ${width} ${height}" font-family="Helvetica, Arial, sans-serif">`,
    `<rect width="${width}" height="${height}" fill="#0A0D12"/>`,
    text(gap, 52, title, 30, "#E8EEF6", 600),
    text(
      gap,
      80,
      `${audition.candidates.length} candidates at ${audition.aspect.toFixed(2)}:1 ` +
        `(${audition.viewport.width}x${audition.viewport.height}px) — ` +
        `elected ${audition.winner.name}`,
      19,
      "#8CA0BC",
    ),
  );

  shown.forEach((candidate, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = gap + column * (panelWidth + gap);
    const y = header + row * (panelHeight + caption + gap);
    parts.push(panel(candidate, audition, x, y, panelWidth, panelHeight, caption));
  });

  parts.push("</svg>");
  return parts.join("\n");
}

/** Two layouts are the same picture if every plate is in the same place. */
function geometryKey(layout: MachineLayout): string {
  return layout.nodes
    .map((node) => `${node.id}:${Math.round(node.rect.x)},${Math.round(node.rect.y)}`)
    .sort()
    .join("|");
}

function panel(
  candidate: LayoutCandidate,
  audition: Audition,
  x: number,
  y: number,
  width: number,
  height: number,
  caption: number,
): string {
  const { layout, score } = candidate;
  const elected = candidate === audition.winner;
  const incumbent = candidate === audition.incumbent;

  // Exactly the overview the film would take: `fitWidth` at the reveal padding, which is what
  // `canonicalOverview` does. So a label that cannot be read here cannot be read in the film.
  const shot = fitWidth(layout.bounds, audition.aspect, 0.035);
  const scale = width / shot;
  const cx = layout.bounds.x + layout.bounds.width / 2;
  const cy = layout.bounds.y + layout.bounds.height / 2;
  const tx = width / 2 - cx * scale;
  const ty = height / 2 - cy * scale;

  const parts: string[] = [];
  parts.push(`<g transform="translate(${x} ${y})">`);
  parts.push(
    `<rect width="${width}" height="${height}" fill="#080B10" stroke="${
      elected ? "#E9A85E" : "#22303F"
    }" stroke-width="${elected ? 3 : 1}"/>`,
  );
  parts.push(`<g transform="translate(${tx} ${ty}) scale(${scale})">`);

  for (const edge of layout.edges) {
    parts.push(
      `<path d="${edge.path}" fill="none" stroke="#5C6D87" stroke-width="${
        MACHINE.edgeStroke
      }" stroke-linecap="round"/>`,
    );
  }
  for (const node of layout.nodes) {
    parts.push(
      `<rect x="${node.rect.x}" y="${node.rect.y}" width="${node.rect.width}" ` +
        `height="${node.rect.height}" rx="${node.rect.height / 2}" fill="#0F151D" ` +
        `stroke="#8CA0BC" stroke-width="${MACHINE.plateStroke}"/>`,
    );
    node.lines.forEach((line, index) => {
      const lineHeight = MACHINE.label * MACHINE.lineHeight;
      const top =
        node.rect.y + node.rect.height / 2 - ((node.lines.length - 1) * lineHeight) / 2;
      parts.push(
        `<text x="${node.rect.x + node.rect.width / 2}" y="${top + index * lineHeight}" ` +
          `font-size="${MACHINE.label}" fill="#DCE6F2" font-weight="600" ` +
          `text-anchor="middle" dominant-baseline="central">${escape(line)}</text>`,
      );
    });
  }
  for (const edge of layout.edges) {
    // The label box is drawn as well as the text: a caption that overlaps a plate is the defect
    // this sheet exists to make visible, and the outline is what makes it visible at panel scale.
    parts.push(
      `<rect x="${edge.label.x}" y="${edge.label.y}" width="${edge.label.width}" ` +
        `height="${edge.label.height}" fill="none" stroke="#2A3949" stroke-width="1.5"/>`,
    );
    edge.lines.forEach((line, index) => {
      const lineHeight = MACHINE.event * MACHINE.eventLineHeight;
      const top =
        edge.label.y + edge.label.height / 2 - ((edge.lines.length - 1) * lineHeight) / 2;
      parts.push(
        `<text x="${edge.label.x + edge.label.width / 2}" y="${top + index * lineHeight}" ` +
          `font-size="${MACHINE.event}" fill="#9FB2C8" text-anchor="middle" ` +
          `dominant-baseline="central">${escape(line)}</text>`,
      );
    });
  }
  parts.push("</g>");

  const mark = elected ? "ELECTED  " : incumbent ? "incumbent  " : "";
  parts.push(
    text(
      0,
      height + 30,
      `${mark}${candidate.name}`,
      20,
      elected ? "#E9A85E" : "#C7D6E8",
      600,
    ),
  );
  parts.push(
    text(
      0,
      height + 56,
      `${Math.round(layout.bounds.width)}x${Math.round(layout.bounds.height)}  ` +
        `state ${score.stateNamePx.toFixed(1)}px  event ${score.eventLabelPx.toFixed(1)}px  ` +
        `crossings ${score.crossings}  ambiguous ${score.ambiguousPairs}  ` +
        `loops ${score.loopCollisions}`,
      17,
      "#8CA0BC",
    ),
  );
  parts.push(
    text(
      0,
      height + 78,
      `overlap n ${score.nodeOverlap.toFixed(2)} / l ${score.labelOverlap.toFixed(2)} / ` +
        `l-on-n ${score.labelOnNode.toFixed(2)} / l-on-e ${score.labelOnEdge}  ` +
        `core ${score.coreSpan.toFixed(2)}  framable ${Math.round(score.framable * 100)}%  ` +
        `TOTAL ${score.total.toFixed(1)}`,
      17,
      "#8CA0BC",
    ),
  );
  parts.push("</g>");
  return parts.join("\n");
}

function text(
  x: number,
  y: number,
  body: string,
  size: number,
  fill: string,
  weight: number = 400,
): string {
  return (
    `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ` +
    `font-weight="${weight}">${escape(body)}</text>`
  );
}

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
