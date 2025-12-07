#!/bin/bash
# Script per verificare se le modifiche richiedono un update del seed

echo "🔍 Checking if seed.ts needs to be updated..."
echo ""

FILES_CHANGED=$(git diff --name-only HEAD 2>/dev/null || echo "")
FILES_STAGED=$(git diff --cached --name-only 2>/dev/null || echo "")

ALL_FILES="$FILES_CHANGED $FILES_STAGED"

NEEDS_UPDATE=false

# Check for Prisma schema changes
if echo "$ALL_FILES" | grep -q "schema.prisma"; then
    echo "⚠️  schema.prisma was modified"
    
    # Check for GameType enum changes
    if git diff HEAD schema.prisma 2>/dev/null | grep -q "^\+.*enum GameType" || \
       git diff --cached schema.prisma 2>/dev/null | grep -q "^\+.*enum GameType" || \
       git diff HEAD schema.prisma 2>/dev/null | grep -q "^\+.*MINES\|PLINKO\|CRASH\|DICE" || \
       git diff --cached schema.prisma 2>/dev/null | grep -q "^\+.*MINES\|PLINKO\|CRASH\|DICE"; then
        echo "   → GameType enum changed - SEED UPDATE NEEDED"
        NEEDS_UPDATE=true
    fi
    
    # Check for Game model changes
    if git diff HEAD schema.prisma 2>/dev/null | grep -q "^\+.*model Game\|^\+.*houseEdge\|^\+.*minBet\|^\+.*maxBet" || \
       git diff --cached schema.prisma 2>/dev/null | grep -q "^\+.*model Game\|^\+.*houseEdge\|^\+.*minBet\|^\+.*maxBet"; then
        echo "   → Game model changed - SEED UPDATE NEEDED"
        NEEDS_UPDATE=true
    fi
    
    # Check for config models
    for model in "XpConfig" "LevelConfig" "RewardConfig" "AdRewardConfig" "WheelConfig" "RaceConfig" "Config" "FeatureFlag"; do
        if git diff HEAD schema.prisma 2>/dev/null | grep -qi "^\+.*model $model" || \
           git diff --cached schema.prisma 2>/dev/null | grep -qi "^\+.*model $model"; then
            echo "   → $model model changed - SEED UPDATE NEEDED"
            NEEDS_UPDATE=true
        fi
    done
fi

# Check for seed.ts changes (if it was modified, might be updating)
if echo "$ALL_FILES" | grep -q "seed.ts"; then
    echo "✅ seed.ts was modified - Good!"
fi

if [ "$NEEDS_UPDATE" = true ]; then
    echo ""
    echo "❌ SEED UPDATE REQUIRED!"
    echo "   Please update backend/prisma/seed.ts before committing"
    echo "   See backend/prisma/SEED_CHECKLIST.md for guidance"
    exit 1
else
    echo "✅ No seed update needed based on file changes"
    exit 0
fi

