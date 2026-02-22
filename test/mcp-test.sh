#!/bin/bash
# ─────────────────────────────────────────────────────────────
# MCP Server Test Suite — Tests all 17 cap_ tools
# ─────────────────────────────────────────────────────────────
#
# Prerequisites:
#   cd mcp-server && npm run build && cd ..
#
# Usage:
#   bash test/mcp-test.sh
#
# Uses MCP Inspector CLI to call each tool and verify a response.
# Exit code 0 = all passed, non-zero = failures detected.
# ─────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MCP_SERVER="node $PROJECT_DIR/mcp-server/build/index.js"
INSPECTOR="npx -y @modelcontextprotocol/inspector --cli"

PASS=0
FAIL=0
ERRORS=""

# Helper: call a tool and check for non-empty response
test_tool() {
  local tool_name="$1"
  local args="$2"
  local description="$3"

  printf "  %-22s %-45s " "$tool_name" "$description"

  local output
  if output=$(echo "$args" | $INSPECTOR --server "$MCP_SERVER" --tool "$tool_name" 2>&1); then
    if [ -n "$output" ] && ! echo "$output" | grep -qi "error\|not found\|failed"; then
      echo "✓ PASS"
      PASS=$((PASS + 1))
    else
      echo "✗ FAIL (empty or error response)"
      FAIL=$((FAIL + 1))
      ERRORS="$ERRORS\n  $tool_name: $output"
    fi
  else
    echo "✗ FAIL (exit code $?)"
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS\n  $tool_name: $output"
  fi
}

echo "═══════════════════════════════════════════════════════════"
echo " MCP Server Test Suite — 17 Tools"
echo " Server: $MCP_SERVER"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ─── Model Introspection (5 tools) ────────────────────────────
echo "── Model Introspection ──────────────────────────────────"
test_tool "cap_entities"      '{}'                                    "List all entities"
test_tool "cap_entity_detail" '{"entity": "Carriers"}'                "Carrier entity detail"
test_tool "cap_associations"  '{}'                                    "All associations"
test_tool "cap_nav_map"       '{}'                                    "Full navigation map"
test_tool "cap_services"      '{}'                                    "Service definitions"
echo ""

# ─── Schema & Compilation (2 tools) ──────────────────────────
echo "── Schema & Compilation ─────────────────────────────────"
test_tool "cap_compile"       '{"format": "json"}'                    "Compile to JSON (CSN)"
test_tool "cap_edm"           '{}'                                    "Generate OData EDMX"
echo ""

# ─── Data Queries (4 tools) ──────────────────────────────────
echo "── Data Queries ─────────────────────────────────────────"
test_tool "cap_cql_query"     '{"sql": "SELECT CARRID, CARRNAME FROM flights_Carriers LIMIT 5"}' "SQL query"
test_tool "cap_data_stats"    '{}'                                    "Entity row counts"
test_tool "cap_sample_data"   '{"entity": "Carriers", "maxRows": 3}' "Sample rows"
test_tool "cap_db_schema"     '{}'                                    "Database schema"
echo ""

# ─── Data Inspection (1 tool) ────────────────────────────────
echo "── Data Inspection ──────────────────────────────────────"
test_tool "cap_csv_inspect"   '{}'                                    "List CSV files"
echo ""

# ─── Project Management (4 tools) ────────────────────────────
echo "── Project Management ───────────────────────────────────"
test_tool "cap_project_info"  '{}'                                    "Project info"
test_tool "cap_mta_info"      '{}'                                    "MTA descriptor"
test_tool "cap_build"         '{}'                                    "CDS build (dev)"
test_tool "cap_hana_mapping"  '{}'                                    "CDS→HANA mapping"
echo ""

# ─── OData Live Query (1 tool — may fail without cds watch) ──
echo "── OData Live Query ─────────────────────────────────────"
test_tool "cap_query"         '{"entity": "Carriers", "top": 3}'     "Live OData query (needs cds watch)"
echo ""

# ─── Summary ─────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════"
echo " Results: $PASS passed, $FAIL failed (of $((PASS + FAIL)) tools)"
echo "═══════════════════════════════════════════════════════════"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
