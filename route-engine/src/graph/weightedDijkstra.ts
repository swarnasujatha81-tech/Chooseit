import type { RouteGraph, StopName } from '../types.js';

type PQNode = { node: StopName; dist: number };

class MinHeap {
  private data: PQNode[] = [];

  push(item: PQNode) {
    this.data.push(item);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): PQNode | undefined {
    if (!this.data.length) return undefined;
    const top = this.data[0];
    const last = this.data.pop() as PQNode;
    if (this.data.length) {
      this.data[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  get size() {
    return this.data.length;
  }

  private bubbleUp(idx: number) {
    const el = this.data[idx];
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      const parent = this.data[parentIdx];
      if (el.dist >= parent.dist) break;
      this.data[parentIdx] = el;
      this.data[idx] = parent;
      idx = parentIdx;
    }
  }

  private sinkDown(idx: number) {
    const length = this.data.length;
    const el = this.data[idx];
    while (true) {
      let leftIdx = 2 * idx + 1;
      let rightIdx = 2 * idx + 2;
      let swapIdx: number | null = null;

      if (leftIdx < length) {
        if (this.data[leftIdx].dist < el.dist) swapIdx = leftIdx;
      }
      if (rightIdx < length) {
        if ((swapIdx === null && this.data[rightIdx].dist < el.dist) || (swapIdx !== null && this.data[rightIdx].dist < this.data[leftIdx].dist)) {
          swapIdx = rightIdx;
        }
      }
      if (swapIdx === null) break;
      this.data[idx] = this.data[swapIdx];
      this.data[swapIdx] = el;
      idx = swapIdx;
    }
  }
}

export function dijkstra(graph: RouteGraph, start: StopName, goal: StopName) {
  if (start === goal) return { path: [start], total_weight: 0, estimated_duration_min: 0, visited_nodes: 1 };

  const distances = new Map<StopName, number>();
  const previous = new Map<StopName, StopName | null>();
  const visited = new Set<StopName>();

  const heap = new MinHeap();
  distances.set(start, 0);
  heap.push({ node: start, dist: 0 });

  while (heap.size) {
    const current = heap.pop() as PQNode;
    const u = current.node;
    const distU = current.dist;

    if (visited.has(u)) continue;
    visited.add(u);

    if (u === goal) break;

    const neighbors = graph.get(u) || [];
    for (const edge of neighbors) {
      const v = edge.to;
      if (visited.has(v)) continue;
      const weight = edge.weight ?? 1;
      const alt = distU + weight;
      const known = distances.get(v);
      if (known === undefined || alt < known) {
        distances.set(v, alt);
        previous.set(v, u);
        heap.push({ node: v, dist: alt });
      }
    }
  }

  const visited_nodes = visited.size;
  const total_weight = distances.get(goal) ?? Infinity;

  if (!isFinite(total_weight)) {
    return { path: [], total_weight: Infinity, estimated_duration_min: Infinity, visited_nodes };
  }

  // reconstruct path
  const path: StopName[] = [];
  let cur: StopName | null | undefined = goal;
  while (cur) {
    path.unshift(cur);
    if (cur === start) break;
    cur = previous.get(cur) ?? null;
  }

  return { path, total_weight, estimated_duration_min: Math.round(total_weight), visited_nodes };
}

export default { dijkstra };
