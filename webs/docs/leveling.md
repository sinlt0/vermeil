# Leveling System

Vermeil features an Amari-style XP system that rewards active users with levels, role rewards, and beautifully designed rank cards.

## Overview

The leveling system calculates XP based on message activity (text) and time spent in voice channels (VC). It includes a weekly reset for competitive leaderboards and a global leaderboard to see who's top in the entire server.

### Key Features
- **Text XP**: Earn XP by chatting in text channels.
- **Voice XP**: Earn XP while hanging out in voice channels.
- **Role Rewards**: Automatically gain roles when reaching specific levels.
- **Customization**: Personalize your rank card with custom colors.
- **Multipliers**: Boost XP gain for specific roles or users.

## Setup

1. Enable the system using `!leveling on`.
2. Configure where level-up messages go with `!level up-channel #channel`.
3. Set up role rewards with `!rolerewards add <level> @role`.
4. (Optional) Set multipliers for donors or active roles with `!multiplier add @role 1.5`.

## Commands

### 📈 General
| Command | Description |
|---------|-------------|
| `rank` | View your current level, XP, and progress card. |
| `leaderboard`| View the top active users in the server. |
| `xpbarcolor` | Set the color of the progress bar on your rank card. |

### 🛠️ Configuration (Admins)
| Command | Description |
|---------|-------------|
| `leveling` | Toggle the system on/off or change main settings. |
| `level` | Configure level-up announcements and messages. |
| `rolerewards`| Manage automatic role rewards for leveling up. |
| `multiplier` | Manage XP boosts (multipliers) for roles or users. |
| `xp` | Give, take, or set XP for a specific member. |

## Rank Cards
Your rank card shows your level, current XP, and a progress bar showing how close you are to the next level. You can personalize the look using `!xpbarcolor <hex>`.

## Role Rewards & Multipliers
Vermeil supports stackable or single role rewards. Use `!rolerewards` to see all current configuration. To incentivize activity, you can also assign multipliers to specific roles, such as "Server Booster" or "Active Member," to help them level up faster.
