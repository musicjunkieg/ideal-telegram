#!/bin/bash
# Pre-compact hook: Instructs Claude to save session context before compaction

HOOK_DIR="$(dirname "$0")"
INSTRUCTIONS="$HOOK_DIR/pre-compact.md"

echo "🔄 COMPACTION IMMINENT - SAVE SESSION CONTEXT"
echo ""
echo "Before compaction proceeds, you MUST write a session context file."
echo ""

if [ -f "$INSTRUCTIONS" ]; then
    cat "$INSTRUCTIONS"
fi

echo ""
echo "📝 Write context to: .claude/session-context/$(date +%Y-%m-%d-%H%M%S).md"
echo ""
echo "⚠️  DO NOT PROCEED until the context file is written!"
