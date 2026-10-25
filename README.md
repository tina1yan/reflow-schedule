# Reflow

**Schedules should move. People should stay in sync.**

[Try the live playground](https://reflow-schedule.pages.dev/)

Reflow explores a simple idea: a schedule should be adjustable. When a new priority arrives, rearrange flexible commitments within their boundaries, explain the changes, notify affected people, and let them request a different time.

## Working prototype

- Compare current and proposed schedules. Preserve fixed commitments, durations, time windows, and protected priorities.
- Edit events, import/export JSON, undo changes, and save the day on this device.
- Preview notifications for fictional participants. Accept, request a different window, or keep an existing meeting at its original time.
- Every counter-request creates a new revision and clears previous approvals. Apply only when all affected participants accept that revision.

**This is a local interactive concept, not a connected calendar service.** Notifications and participant responses are simulated in the same browser. No email or push notification is sent. There is no login, shared database, participant authentication, or calendar integration. Sample people and schedules are fictional. Browser storage stays on this device. Exported files contain entered schedules. Proposals and simulated responses are session-only.

## Run and test

Open `index.html` in a modern browser, or serve the directory with a static server.

```sh
node --test engine.test.cjs workflow.test.cjs
node build.cjs
```

The build creates a portable `Reflow.html` with application code inline. No packages, API keys, or build dependencies are required.

## Architecture

`engine.js` is a deterministic bounded branch-and-bound scheduler. It covers one fictional day from 09:00 to 18:00 in 15-minute steps, with at most 12 total events. It minimizes a priority-weighted movement score, not the raw number of moved events. Movable meetings carry higher movement costs than flexible tasks. Search-budget exhaustion is distinguished from proved infeasibility and optimality.

`workflow.js` owns revisions, affected participants, intersecting time windows, pinned meetings, approval invalidation, and stale-calendar checks. `app.js` handles rendering and local persistence. `index.html` explains the product; `style.css` provides a responsive dark studio.

Tests cover scheduling constraints, an exhaustive oracle across 72 cases, approval gating, counter-proposals, conflicting windows, stale approvals/calendars, and pinned meetings.

## Design references

Explored [Schedule-X](https://github.com/schedule-x/schedule-x), [coss UI](https://github.com/cosscom/ui), and [Trud Calendar](https://github.com/trudapp/trud-calendar) for calendar hierarchy and controls. Reflow uses original vanilla HTML/CSS/JavaScript; no source or assets from these projects are bundled. Charcoal surfaces, lime new priorities, cyan flexible tasks, and violet shared meetings distinguish scheduling roles.

## Deployment and discovery

Hosted on Cloudflare Pages. Robots, sitemap, canonical/social metadata, and SoftwareApplication structured data support discovery. Indexing is controlled by search engines and is not guaranteed by publishing or sitemap submission.

`build-worker.cjs` generates an optional Pages advanced-mode `_worker.js` embedding an explicit public asset allowlist. Run it after `build.cjs` for API deployment. It supports GET/HEAD and returns 404 for unknown paths. This method uses Pages Functions requests; conventional static hosting can serve the same public assets directly. Do not expose the entire source directory unintentionally.

## Production milestone

Real coordination needs authenticated participants, server-stored revisions, expiring response links, an idempotent notification outbox, delivery monitoring, timezone-aware dates, and calendar integration. Preserve the agreement rule: shared changes require acceptance of the current revision. This prototype does not claim real notification delivery.
