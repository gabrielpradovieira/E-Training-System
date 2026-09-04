#!/usr/bin/env node
/**
 * Pulls every video's run time from the Bunny Stream library and writes
 * src/lib/bunny-durations.json, keyed by video GUID (not lesson label, so
 * it stays correct regardless of how lessons get renamed or re-ordered).
 *
 * Requires BUNNY_API_KEY in the environment. Library ID defaults to the
 * one already wired into the app (see src/lib/bunny.ts) but can be
 * overridden with BUNNY_LIBRARY_ID.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "src", "lib", "bunny-durations.json");

const apiKey = process.env.BUNNY_API_KEY;
if (!apiKey) {
  console.error("Missing BUNNY_API_KEY environment variable.");
  process.exit(1);
}

const libraryId = process.env.BUNNY_LIBRARY_ID || "741383";

async function fetchAllVideos() {
  const videos = [];
  let page = 1;
  const itemsPerPage = 100;

  for (;;) {
    const url = `https://video.bunnycdn.com/library/${libraryId}/videos?page=${page}&itemsPerPage=${itemsPerPage}`;
    const res = await fetch(url, { headers: { AccessKey: apiKey } });
    if (!res.ok) {
      throw new Error(`Bunny API error ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    videos.push(...data.items);
    if (videos.length >= data.totalItems || data.items.length === 0) break;
    page += 1;
  }

  return videos;
}

const videos = await fetchAllVideos();

/** @type {Record<string, number>} */
const durations = {};
for (const video of videos) {
  durations[video.guid] = video.length;
}

const sorted = Object.fromEntries(Object.entries(durations).sort(([a], [b]) => a.localeCompare(b)));

let previous = {};
try {
  previous = JSON.parse(readFileSync(OUTPUT_PATH, "utf8"));
} catch {
  // First run, or file missing — fine, treat as empty.
}

const changed = JSON.stringify(previous) !== JSON.stringify(sorted);

writeFileSync(OUTPUT_PATH, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");

console.log(`Synced ${videos.length} video durations from Bunny library ${libraryId}.`);
console.log(changed ? "Durations changed." : "No changes.");

// Exposes whether anything changed to the calling shell/CI step.
process.exitCode = 0;
if (process.env.GITHUB_OUTPUT) {
  writeFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`, { flag: "a" });
}
