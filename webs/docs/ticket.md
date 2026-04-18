# Ticket System

Provide professional support with Vermeil's advanced ticket system, featuring dynamic categories, custom forms, and automated management.

## Overview

The ticket system is designed to streamline support by allowing you to create different "Panels" for various support types (e.g., General Support, Billing, Bug Reports). Each category can have its own support team, custom questions, and automatic settings.

### Key Features
- **Multi-Category Support**: Different teams for different topics.
- **Custom Forms**: Collect important details from users before the ticket opens.
- **Transcripts**: Automatically save and log ticket history when closed.
- **Claim System**: Allow staff to take ownership of specific tickets.
- **Auto-Close**: Close inactive tickets automatically.

## Setup

1. Configure the main system with `!ticketconfig setup`.
2. Create a category using `!ticketcategory create <name>`.
3. (Optional) Set up a form for the category with `!ticketform add <catID>`.
4. (Optional) Assign a support role with `!ticketrole add <catID> @role`.
5. Send the interaction panel to a channel with `!ticketpanel send <catID> #channel`.

## Commands

### 🎫 User Interaction
| Command | Description |
|---------|-------------|
| `ticketpanel` | Create and send a ticket interaction panel. |
| `ticketform` | Configure and manage question forms for tickets. |

### 🛠️ Ticket Management
| Command | Description |
|---------|-------------|
| `claim` | Staff: Take ownership of the current ticket. |
| `close` | Close the current ticket and generate a transcript. |
| `add` | Add another user to an open ticket. |
| `remove` | Remove a user from an open ticket. |
| `rename` | Rename the current ticket channel. |

### ⚙️ System Configuration (Admins)
| Command | Description |
|---------|-------------|
| `ticketconfig` | Configure global ticket system settings and logs. |
| `ticketcategory`| Create, delete, or modify ticket categories. |
| `ticketrole` | Manage which roles can see and manage tickets. |

## Transcripts & Logging
When a ticket is closed, Vermeil generates a beautiful HTML transcript of the entire conversation. These are automatically saved and sent to your configured ticket log channel for future reference.

## Staff Roles
By adding roles via `!ticketrole`, you can ensure that only specific people (like Moderators or Support Staff) can see and respond to tickets in certain categories.
