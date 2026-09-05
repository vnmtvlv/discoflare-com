---
title: Roadmap
description: See what Discoflare ships now, what is in development, and which directions are still exploratory.
navigation: false
---

This roadmap communicates product direction. It is not a release calendar, service-level commitment, or promise that every exploratory item will ship.

## Status language

| Status | Meaning |
| --- | --- |
| **Available** | Included in a tagged release and documented as behavior operators can verify. |
| **In development** | Being implemented or tested; not yet a released capability. |
| **Planned** | A defined next problem and boundary, without a committed release date. |
| **Exploring** | A direction under design that may change or be removed. |

## Product areas

| Area | Available | Direction |
| --- | --- | --- |
| Workspace apps | Chat, Tasks, Mail, and Databases | A thin GitHub-backed Project surface is exploratory. |
| Agents | Workspace-member profiles, Chat turns, vision-capable models, approvals, Sandbox computers, and durable Task Runs | Stronger Task evidence, scoped repository connections, previews, pull requests, and explicit production approval. |
| Operations | Guided Cloudflare installation, manual GitHub deployment, health checks, backups, and in-place updates | Clearer upgrade evidence and safer operator workflows as the app set expands. |

Read the detailed [Apps roadmap](/docs/roadmap/apps) and [Agents roadmap](/docs/roadmap/agents).

## How an item becomes available

A capability moves to **Available** only after all of these are true:

1. the implementation and required migration or binding changes are in the application repository;
2. the behavior has an authorization boundary, not only a visible UI;
3. tests and builds pass at the appropriate scope;
4. a tagged release includes the change; and
5. the documentation explains an observable verification path.

A local branch, screenshot, passing build, or deployed Worker is useful evidence, but none alone changes roadmap status.

## Follow changes

Tagged releases and release notes in the [Discoflare repository](https://github.com/vnmtvlv/discoflare/releases) are the source for what has shipped. Issues and discussions may describe work before it meets the **Available** gate above.
