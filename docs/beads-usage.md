# Beads Issue Tracking

This project uses **beads** for issue tracking. The database is in the parent directory (`../.beads/`).

## Workflow

```
1. FIND  →  2. CLAIM  →  3. WORK  →  4. CLOSE  →  5. REPEAT
```

## Commands

### Finding Work

```bash
/beads:ready              # Show tasks with no blockers (start here!)
/beads:list               # List all issues with filters
/beads:blocked            # Show blocked issues
```

### Working on Issues

```bash
/beads:show <id>          # View issue details
/beads:update <id>        # Update status/priority/fields
/beads:close <id>         # Close completed issue
```

### Creating Issues

```bash
/beads:create             # Create new issue interactively
/beads:dep                # Manage dependencies between issues
```

### Project Overview

```bash
/beads:stats              # Project statistics
/beads:workflow           # Show workflow guide
```

## Issue Properties

| Property     | Values                                         |
| ------------ | ---------------------------------------------- |
| **Status**   | `open`, `in_progress`, `blocked`, `closed`     |
| **Priority** | 0=critical, 1=high, 2=medium, 3=low, 4=backlog |
| **Type**     | `bug`, `feature`, `task`, `epic`, `chore`      |

## Typical Session

1. Run `/beads:ready` to find unblocked tasks
2. Pick a task and update to `in_progress`: `/beads:update <id>`
3. Do the work
4. If you discover new work, create issues with `/beads:create`
5. Close when done: `/beads:close <id> "Completed: summary"`
6. Check `/beads:ready` again for newly unblocked work

## Git Sync

Changes auto-export to `.beads/issues.jsonl`. After `git pull`, JSONL auto-imports if newer than DB.
