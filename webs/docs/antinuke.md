# Antinuke System

The antinuke system is an advanced security suite designed to protect your server from malicious administrators and nuke attempts.

## Overview

The antinuke system monitors dangerous actions like mass channel/role deletion, mass member pruning, and dangerous permission changes. It can automatically quarantine offenders, strip their roles, and lock down the server in "Panic Mode" if a high-severity threat is detected.

The system uses a **Quarantine** role to isolate users without needing to kick or ban them immediately, allowing for review by the server owner.

## Setup

1. Run `!setup` to automatically create the **Quarantine** role and log channels (`#an-logs` and `#an-modlogs`).
2. Use `!statics user ?add 11 @user` to add **Extra Owners** (trusted users who can bypass filters and manage settings).
3. Use `!statics user ?add 10 @user` to add **Trusted Admins**.
4. Configure filters using `!antinuke` (or `!an`).
5. Whitelist other bots or specific users using `!whitelist @target`.

## Commands

| Command | Description |
|---------|-------------|
| `antinuke` | View and configure antinuke filters. |
| `aninfo` | View detailed antinuke status and user info. |
| `anlogs` | View recent antinuke action logs. |
| `anp` | Configure antinuke panic settings (ping roles, whitelisted categories). |
| `backup` | Manage server backups (manual/auto backups of roles/channels). |
| `panicmode` | Manually trigger or end server-wide Panic Mode. |
| `quarantine` | Manually quarantine/unquarantine members or list current entries. |
| `setup` | Auto-setup the antinuke system infrastructure. |
| `statics` | Manage antinuke statics (Trusted Admins, Extra Owners, Roles, Channels). |
| `whitelist` | Manage whitelisted users, roles, and channels exempt from specific filters. |

## Panic Mode

When Panic Mode is activated (automatically or manually):
- All channels are locked (ViewChannel/SendMessages denied for @everyone).
- Dangerous permissions are stripped from all roles.
- Configured "Panic Ping Roles" are notified.
- The server stays in lockdown until `!panicmode ?off` is run by the Owner or an Extra Owner.
