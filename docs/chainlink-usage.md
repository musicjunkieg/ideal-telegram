# Chainlink Issue Tracking

This project uses **chainlink** for issue tracking. The database is in `.chainlink/issues.db`.

## Workflow

```
1. FIND  →  2. CLAIM  →  3. WORK  →  4. CLOSE  →  5. REPEAT
```

## Commands

### Finding Work

```bash
chainlink ready              # Show tasks with no blockers (start here!)
chainlink list               # List all issues with filters
chainlink blocked            # Show blocked issues
chainlink search <query>     # Search issues by text
```

### Working on Issues

```bash
chainlink show <id>          # View issue details
chainlink update <id>        # Update status/priority/fields
chainlink close <id>         # Close completed issue
chainlink reopen <id>        # Reopen a closed issue
```

### Creating Issues

```bash
chainlink create "Title"     # Create new issue
chainlink subissue <parent>  # Create subissue under parent
chainlink block <id> <blocker>  # Mark issue as blocked by another
chainlink unblock <id> <blocker>  # Remove blocking relationship
```

### Project Overview

```bash
chainlink list --status open    # List open issues
chainlink tree                  # Show issues as hierarchy
```

## Issue Properties

| Property     | Values                                   |
| ------------ | ---------------------------------------- |
| **Status**   | `open`, `closed`                         |
| **Priority** | `low`, `medium`, `high`, `critical`      |
| **Labels**   | `epic`, `task`, `feature`, `bug`, etc.   |

## Typical Session

1. Run `chainlink ready` to find unblocked tasks
2. Pick a task and start working
3. If you discover new work, create issues with `chainlink create`
4. Close when done: `chainlink close <id>`
5. Check `chainlink ready` again for newly unblocked work

## Time Tracking

```bash
chainlink start <id>         # Start timer for issue
chainlink stop               # Stop current timer
chainlink timer              # Show current timer status
```

## Labels and Comments

```bash
chainlink label <id> <label>    # Add label to issue
chainlink unlabel <id> <label>  # Remove label
chainlink comment <id>          # Add comment to issue
```

## Export/Import

```bash
chainlink export -o issues.json    # Export to JSON
chainlink import issues.json       # Import from JSON
```
