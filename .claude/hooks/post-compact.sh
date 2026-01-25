#!/bin/bash
# Post-compact hook: Loads the most recent session context after compaction

CONTEXT_DIR="$(dirname "$0")/../session-context"

# Find the most recent context file
if [ -d "$CONTEXT_DIR" ]; then
    LATEST=$(ls -t "$CONTEXT_DIR"/*.md 2>/dev/null | head -1)

    if [ -n "$LATEST" ] && [ -f "$LATEST" ]; then
        echo "📖 RESTORED SESSION CONTEXT"
        echo "Source: $LATEST"
        echo ""
        echo "---"
        cat "$LATEST"
        echo "---"
        echo ""
        echo "✅ Context restored. Review the above to resume work."
    else
        echo "⚠️  No session context files found in $CONTEXT_DIR"
        echo "This may be a fresh session or context was not saved before compaction."
    fi
else
    echo "⚠️  Session context directory not found: $CONTEXT_DIR"
fi
