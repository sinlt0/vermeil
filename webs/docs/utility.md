# Utility Commands

Vermeil provides a set of essential everyday tools to help manage your server and interact with your community.

## Overview

Utility commands are designed to be fast and helpful. They cover everything from viewing user profiles and server assets to calculating math and setting reminders for yourself.

### Key Features
- **User Info**: View high-quality avatars and banners from any user.
- **Server Info**: Get details and icons from the current server.
- **Tools**: Calculate complex math expressions or let the bot make a choice for you.
- **Reminders**: Never forget a task again with a built-in reminder system.
- **Nuke**: Quickly reset a channel by deleting and recreating it with the same settings.

## Commands

### 🔍 Information
| Command | Description |
|---------|-------------|
| `avatar` | View your or another user's profile avatar. |
| `banner` | View your or another user's profile banner. |
| `svavatar`| View the current server's icon. |
| `svbanner`| View the current server's banner. |
| `ping` | Check the bot's current latency and API response time. |

### 🛠️ Tools
| Command | Description |
|---------|-------------|
| `calc` | Calculate any mathematical expression. |
| `choose` | Let the bot pick from a list of options. |
| `coinflip`| Flip a coin (Heads or Tails). |
| `reminder`| Set, list, or cancel a personal timer/reminder. |

### ⚙️ Channel Management (Admins)
| Command | Description |
|---------|-------------|
| `nuke` | Delete and recreate the current channel with the same permissions. |
| `help` | Browse all available commands and their categories. |

## Reminders
The `!reminder` command is a powerful tool to help you stay organized. You can set a reminder by specifying a duration (e.g., `!reminder set 1h check the oven`). The bot will then DM you or ping you in the original channel once the time has passed.

## Nuke Command
The `!nuke` command is a specialized admin tool. It completely clears the chat history of a channel by deleting the channel and recreating it with the exact same name, topic, and permission overrides. Use this with caution, as all previous messages will be permanently lost!
