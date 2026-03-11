# Session Replay

Session Replay is the dedicated operational view for an active task conversation.

## Purpose

The main transcript stays user-facing. Generic background tool activity, replay data, request snapshots, and recent-turn inspection live in Session Replay instead of expanding the core chat surface.

## What it shows

- recent-turn overview
- replay filters and grouped event inspection
- provider-native conversation ids
- persisted request snapshots
- recent session aggregate summaries

## Data source

Replay is backed by persisted turn data:

- provider id
- normalized turn event timeline
- provider-native conversation ids
- request snapshot payload

That lets Stave show both what the provider emitted and what Stave actually sent into the turn.

## Inline vs replay split

Main chat keeps:

- assistant and user text
- approvals and user-input requests
- subagent and diff blocks that matter directly to the user
- important non-error system notices

Session Replay owns:

- generic tool execution detail
- event-heavy operational logs
- request and runtime inspection detail

The goal is to keep the task transcript readable without discarding the debugging surface.
