# Pre-Compact Instructions

When this hook fires, Claude MUST write a session context file before compaction occurs.

## Required Actions

1. **Create context file**: Write to `.claude/session-context/YYYY-MM-DD-HHMMSS.md`
2. **Use progressive disclosure structure** (see template below)
3. **Be comprehensive** - this is your memory across compaction

## Template Structure

```markdown
# Session Context: [Brief Title]
*Generated: [ISO timestamp]*

## TL;DR
<!-- 2-3 sentence summary of the entire session -->

## Completed Work
<!-- Bullet list of what was accomplished -->

## Current State
<!-- Where things stand right now - what's working, what's not -->

## Key Decisions Made
<!-- Important choices and their rationale -->

## Technical Details
<!-- Deeper context organized by topic -->

### [Topic 1]
<!-- Details... -->

### [Topic 2]
<!-- Details... -->

## Files Changed
<!-- List of files created/modified/deleted with brief notes -->

## Open Items
<!-- Anything still in progress or discovered but not addressed -->

## Context for Next Session
<!-- What the next session needs to know to continue seamlessly -->
```

## Important

- Write the FULL context - you will lose everything not written
- Include specific file paths, function names, error messages
- Capture WHY decisions were made, not just WHAT was done
- The post-compact hook will read the most recent file
