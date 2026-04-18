# Moderation System

Maintain order and safety in your community with Vermeil's professional moderation suite, featuring a unique case system and automated warning thresholds.

## Overview

Vermeil's moderation system is designed for clarity and speed. All actions (kicks, bans, timeouts, warnings) are assigned a unique **Case ID** per server, which is saved in the database. This allows staff to easily look up past infractions and provides a transparent history of any user's behavior.

### Key Features
- **Case System**: Every moderation action is tracked with a unique ID.
- **Log Channel**: Automatically log all staff actions to a dedicated channel.
- **Auto-Thresholds**: Configure automated punishments (like kicks or bans) when a user reaches a certain number of warnings.
- **Temporary Bans**: Easily issue bans that automatically expire after a set duration.
- **Flexible Purge**: Clean up chat with powerful filters (e.g., only messages with links or from specific users).

## Setup

1. Designate a moderation log channel with `!setmodlogs #channel`.
2. Configure automatic punishment thresholds with `!warnconfig set`.
3. (Optional) Set up a "Staff" role to bypass certain restrictions.

## Commands

### ⚖️ Punishments
| Command | Description |
|---------|-------------|
| `warn` | Issue a formal warning to a member. |
| `timeout` | Temporarily restrict a member's ability to chat or speak. |
| `kick` | Remove a member from the server. |
| `ban` | Permanently or temporarily ban a user from the server. |
| `unban` | Remove a ban from a user by their ID. |
| `purge` | Bulk delete messages from the current channel with optional filters. |

### 🔍 History & Management
| Command | Description |
|---------|-------------|
| `warnings` | View all active and past warnings for a specific member. |
| `delwarn` | Remove a warning by its specific case number. |
| `case` | Look up detailed information about a past moderation action. |
| `warnconfig`| Configure automatic punishments for reaching warning limits. |

## Case System
Every time a moderator warns, kicks, or bans a user, the bot generates a case report. This report includes:
- **Case ID**: A unique number for that server.
- **Action**: What was done (e.g., Ban).
- **Target**: The user who received the punishment.
- **Moderator**: The staff member who issued the command.
- **Reason**: The explanation provided for the action.
- **Timestamp**: Exactly when the action occurred.

You can look up any case using `!case <ID>`.

## Warning Thresholds
Using `!warnconfig`, you can set up a "three strikes" rule or any other configuration. For example, you can set it so that a user is automatically kicked at 3 warnings and banned at 5 warnings. Vermeil will handle these actions instantly without any manual intervention required by staff.
