# Modmail System

Bridge the gap between your community and staff with Vermeil's professional modmail system, enabling secure and organized communication via DMs.

## Overview

Modmail allows users to contact your server's staff team simply by sending a direct message (DM) to the bot. This creates a dedicated "thread" channel in your server where staff can discuss, respond, and manage the user's inquiry without exposing staff accounts.

### Key Features
- **Anonymous Replies**: Staff can choose to reply with their username or hide behind the "Staff Team" identity.
- **Snippets**: Pre-defined responses for frequently asked questions to speed up support.
- **Staff Notes**: Internal notes within the thread that are invisible to the user.
- **Transcripts**: Full history logs saved when a thread is closed.
- **Blacklisting**: Prevent abusive users from opening new threads.

## Setup

1. Enable the system with `!modmailconfig setup`.
2. Configure the staff role using `!modmailconfig role @role`.
3. (Optional) Create snippets with `!snippet add <name> <response>`.
4. (Optional) Set up a log channel for closed transcripts with `!modmailconfig logs #channel`.

## Commands

### 📬 Staff Communication
| Command | Description |
|---------|-------------|
| `reply` | Send a direct message response to the user. |
| `areply` | Send an anonymous response as the "Staff Team." |
| `note` | Add a staff-only internal note to the thread. |
| `snippet` | Quickly send a pre-defined response. |
| `close` | Close the current thread and generate a transcript. |

### 🛠️ Thread Management
| Command | Description |
|---------|-------------|
| `logs` | Look up past threads and transcripts for a specific user. |
| `blacklist` | Block or unblock a user from using modmail. |

### ⚙️ System Configuration (Admins)
| Command | Description |
|---------|-------------|
| `modmailconfig` | Manage all main modmail settings, roles, and categories. |

## How It Works
When a user DMs the bot, Vermeil asks which server they want to contact (if the user shares multiple servers with the bot). Once selected, a new channel is created in the server's modmail category. Staff can see the user's name, ID, account age, and mutual server list. Any message sent in the thread channel using `!reply` or `!areply` will be delivered directly to the user's DMs by the bot.
