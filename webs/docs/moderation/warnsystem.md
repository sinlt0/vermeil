# Warning System

The warning system allows moderators to issue warnings to members and automatically apply punishments at configurable thresholds.

## How it works

1. A moderator issues `warn @user [reason]`
2. The warning is saved as a case in the database
3. The user receives a DM notification
4. If a threshold is reached, the configured action fires automatically

## Configuring Thresholds

Use `warnconfig set <count> <action> [duration]` to set up automatic actions.

### Supported Actions

- `kick` — Kicks the member
- `timeout` — Times out the member (requires duration)
- `tempban` — Temporarily bans the member (requires duration)
- `ban` — Permanently bans the member

### Example

```
!warnconfig set 3 timeout 1h
!warnconfig set 5 tempban 7d
!warnconfig set 10 ban
```

## Viewing Warnings

Use `warnings @user` to see a paginated list of all warnings for a user in your server.

## Deleting Warnings

Use `delwarn <case number>` to permanently delete a warning from the database.
