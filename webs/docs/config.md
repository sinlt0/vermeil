# Server Configuration

Tailor Vermeil to fit your server's needs with essential configuration settings, from prefixes to custom greetings.

## Overview

Configuration commands allow you to set the core foundation of how Vermeil interacts with your server. This includes basic settings like prefixes and logging, as well as more advanced features like verification and automatic roles.

### Key Features
- **Custom Prefix**: Use a character that fits your server's vibe.
- **Automated Greetings**: Welcome new members with custom messages and images.
- **Auto-Roles**: Automatically assign roles to new users and bots.
- **Verification**: Protect your server with a captcha-based verification system.
- **Moderation Logs**: Keep a history of all staff actions in a dedicated channel.

## Setup

1. Change your prefix with `!setprefix <new_prefix>`.
2. Set up logs using `!setmodlogs #channel`.
3. Configure your welcome system with `!greetconfig welcome`.
4. Enable verification with `!verification on`.

## Commands

### ⚙️ Core Settings
| Command | Description |
|---------|-------------|
| `setprefix` | Change the bot's command prefix for your server. |
| `setmodlogs`| Set or clear the moderation log channel. |
| `variables` | List all dynamic variables (like {user}, {serverCount}) for messages. |

### 👋 Welcome & Leave
| Command | Description |
|---------|-------------|
| `greetconfig` | Manage welcome/leave messages, channels, and images. |
| `autorole` | Manage automatic roles given to members and bots on join. |

### 🛡️ Security
| Command | Description |
|---------|-------------|
| `verification`| Configure the captcha-based member verification system. |

## Dynamic Variables
You can use special placeholders in your welcome, leave, and verification messages to make them personalized. Use the `!variables` command to see a full list, including:
- `{user}`: Mentions the joining user.
- `{userName}`: Displays the user's name without the mention.
- `{serverName}`: Displays the name of your server.
- `{memberCount}`: Displays the total number of members in the server.

## Captcha Verification
To prevent raids and bots from entering your server, you can enable captcha verification. When a new user joins, they will be sent a direct message with a visual code. Once they solve it, they will be given the "Member" role automatically.
