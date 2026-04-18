# Giveaway System

Run professional, high-participation giveaways in your server with Vermeil's advanced giveaway system.

## Overview

The giveaway system is built to reward your community with ease. It features automated start/end times, requirement checks (like roles or levels), and a professional host system to manage who can start giveaways.

### Key Features
- **Requirements**: Restrict participation to specific roles or users above a certain level.
- **Auto-Winner**: Automatically pick and mention winners once the timer ends.
- **Reroll**: Easily pick new winners if the original one is ineligible.
- **Host Management**: Configure specific users or roles as giveaway hosts.

## Setup

1. Start a giveaway using `!giveaway start <duration> <winners> <prize>`.
2. (Optional) Configure giveaway host roles with `!gwhost add @role`.

## Commands

### 🎉 Giveaway Interaction
| Command | Description |
|---------|-------------|
| `giveaway start` | Start a new giveaway with a duration, number of winners, and prize. |
| `giveaway reroll` | Choose new winners for a finished giveaway. |
| `giveaway end` | Manually end an active giveaway early. |
| `giveaway list` | Show all active giveaways in the server. |

### 🛠️ Host Management (Admins)
| Command | Description |
|---------|-------------|
| `gwhost` | Manage roles and users allowed to start and manage giveaways. |

## Advanced Giveaways
When starting a giveaway, you can include specific requirements to increase participation in certain parts of your server.
- **Role Requirements**: Only members with a specific role can enter.
- **Level Requirements**: Only members who have reached a certain level in your server's leveling system can enter.
- **Multiplier**: (Optional) Give certain roles (like boosters) extra entries to increase their chance of winning.
