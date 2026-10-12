// SPDX-License-Identifier: EPL-2.0
/**
 * Pure SVG renderer for ELK JSON graphs that already carry layout geometry.
 *
 * A node's x/y are relative to its parent's top-left corner (the root sits at 0,0 and its size is the drawing
 * size); port and node-label offsets are relative to their owner. Edge section points and edge-label offsets are
 * relative to the node whose `edges[]` holds the edge. All output coordinates are absolute; unknown keys are ignored.
 */

export interface ElkPoint {
  x: number;
  y: number;
}
export interface ElkLabelJson {
  id?: string;
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}
export interface ElkPortJson {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  labels?: ElkLabelJson[];
}
export interface ElkEdgeSectionJson {
  id?: string;
  startPoint: ElkPoint;
  endPoint: ElkPoint;
  bendPoints?: ElkPoint[];
}
export interface ElkEdgeJson {
  id: string;
  sources?: string[];
  targets?: string[];
  sections?: ElkEdgeSectionJson[];
  labels?: ElkLabelJson[];
}
export interface ElkGraphJson {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: ElkGraphJson[];
  ports?: ElkPortJson[];
  labels?: ElkLabelJson[];
  edges?: ElkEdgeJson[];
}
export interface ElkSvgOptions {
  padding?: number;
}

const DEFAULT_PADDING = 8;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function shift(origin: ElkPoint, dx = 0, dy = 0): ElkPoint {
  return { x: origin.x + dx, y: origin.y + dy };
}

function renderRect(className: string, id: string | undefined, at: ElkPoint, w = 0, h = 0): string {
  const cls = className === '' ? '' : ` class="${className}"`;
  const data = id === undefined ? '' : ` data-id="${escapeXml(id)}"`;
  return `<rect${cls}${data} x="${at.x}" y="${at.y}" width="${w}" height="${h}"/>`;
}

/** Baseline rule: label y plus its height when known, otherwise label y. */
function renderLabel(label: ElkLabelJson, origin: ElkPoint): string {
  const at = shift(origin, label.x ?? 0, (label.y ?? 0) + (label.height ?? 0));
  return `<text class="elk-label" x="${at.x}" y="${at.y}">${escapeXml(label.text ?? '')}</text>`;
}

function renderLabels(labels: ElkLabelJson[] | undefined, origin: ElkPoint): string[] {
  return (labels ?? []).map((label) => renderLabel(label, origin));
}

function renderPort(port: ElkPortJson, origin: ElkPoint): string[] {
  const at = shift(origin, port.x ?? 0, port.y ?? 0);
  return [renderRect('elk-port', port.id, at, port.width, port.height), ...renderLabels(port.labels, at)];
}

function renderSection(section: ElkEdgeSectionJson, origin: ElkPoint): string {
  const points = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint];
  const text = points.map((p) => `${origin.x + p.x},${origin.y + p.y}`).join(' ');
  return `<polyline class="elk-edge-section" points="${text}"/>`;
}

function renderEdge(edge: ElkEdgeJson, origin: ElkPoint): string {
  const parts = [`<g class="elk-edge" data-id="${escapeXml(edge.id)}">`];
  for (const section of edge.sections ?? []) parts.push(renderSection(section, origin));
  parts.push(...renderLabels(edge.labels, origin), '</g>');
  return parts.join('');
}

function renderContents(node: ElkGraphJson, at: ElkPoint): string[] {
  const parts: string[] = [];
  for (const port of node.ports ?? []) parts.push(...renderPort(port, at));
  parts.push(...renderLabels(node.labels, at));
  for (const child of node.children ?? []) parts.push(renderNode(child, at));
  for (const edge of node.edges ?? []) parts.push(renderEdge(edge, at));
  return parts;
}

function renderNode(node: ElkGraphJson, origin: ElkPoint): string {
  const at = shift(origin, node.x ?? 0, node.y ?? 0);
  const head = `<g class="elk-node" data-id="${escapeXml(node.id)}">`;
  return [head, renderRect('', undefined, at, node.width, node.height), ...renderContents(node, at), '</g>'].join('');
}

function renderSvg(root: ElkGraphJson, padding: number): string {
  const w = (root.width ?? 0) + 2 * padding;
  const h = (root.height ?? 0) + 2 * padding;
  const open = `<svg xmlns="${SVG_NAMESPACE}" viewBox="${-padding} ${-padding} ${w} ${h}" class="elk-diagram" role="img">`;
  return [open, ...renderContents(root, { x: 0, y: 0 }), '</svg>'].join('');
}

export function renderElkSvg(graph: ElkGraphJson, options?: ElkSvgOptions): string {
  return renderSvg(graph, options?.padding ?? DEFAULT_PADDING);
}
