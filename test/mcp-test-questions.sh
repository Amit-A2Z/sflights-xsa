#!/bin/bash
# ─────────────────────────────────────────────────────────────
# MCP Question Test Suite — 10 Example SQL Queries
# ─────────────────────────────────────────────────────────────
#
# Tests the 10 example questions from README.md by running
# their SQL queries directly through the cap_cql_query tool.
#
# Prerequisites:
#   cd mcp-server && npm run build && cd ..
#
# Usage:
#   bash test/mcp-test-questions.sh
# ─────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MCP_SERVER="node $PROJECT_DIR/mcp-server/build/index.js"
INSPECTOR="npx -y @modelcontextprotocol/inspector --cli"

PASS=0
FAIL=0

run_query() {
  local num="$1"
  local desc="$2"
  local sql="$3"

  printf "  Q%-2s %-55s " "$num" "$desc"

  local args="{\"sql\": \"$sql\", \"maxRows\": 10}"
  local output
  if output=$(echo "$args" | $INSPECTOR --server "$MCP_SERVER" --tool "cap_cql_query" 2>&1); then
    if echo "$output" | grep -q "Query Results\|rows"; then
      echo "✓ PASS"
      PASS=$((PASS + 1))
    else
      echo "✗ FAIL (no results)"
      FAIL=$((FAIL + 1))
    fi
  else
    echo "✗ FAIL (error)"
    FAIL=$((FAIL + 1))
  fi
}

echo "═══════════════════════════════════════════════════════════"
echo " MCP Question Test Suite — 10 Example Queries"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Q1: List all airlines
run_query 1 "List all airlines and their currency" \
  "SELECT CARRID, CARRNAME, CURRCODE FROM flights_Carriers ORDER BY CARRNAME"

# Q2: Distinct currencies
run_query 2 "What currencies do airlines use?" \
  "SELECT DISTINCT CURRCODE, COUNT(*) as cnt FROM flights_Carriers GROUP BY CURRCODE"

# Q3: Airlines that fly to New York (3-table JOIN)
run_query 3 "Which airlines fly to New York?" \
  "SELECT DISTINCT c.CARRNAME FROM flights_Carriers c JOIN flights_Connections cn ON cn.MANDT=c.MANDT AND cn.CARRID=c.CARRID WHERE cn.CITYTO='NEW YORK' ORDER BY c.CARRNAME"

# Q4: Average seat occupancy per airline
run_query 4 "Average seat occupancy rate per airline" \
  "SELECT c.CARRNAME, ROUND(AVG(CAST(f.SEATSOCC AS FLOAT)/f.SEATSMAX*100),1) as avg_occ FROM flights_Flights f JOIN flights_Carriers c ON c.MANDT=f.MANDT AND c.CARRID=f.CARRID WHERE f.SEATSMAX>0 GROUP BY c.CARRNAME ORDER BY avg_occ DESC"

# Q5: Top 5 busiest routes
run_query 5 "Top 5 busiest routes by booking count" \
  "SELECT cn.CITYFROM, cn.CITYTO, COUNT(b.BOOKID) as bookings FROM flights_Connections cn JOIN flights_Flights f ON f.MANDT=cn.MANDT AND f.CARRID=cn.CARRID AND f.CONNID=cn.CONNID JOIN flights_Bookings b ON b.MANDT=f.MANDT AND b.CARRID=f.CARRID AND b.CONNID=f.CONNID AND b.FLDATE=f.FLDATE GROUP BY cn.CITYFROM, cn.CITYTO ORDER BY bookings DESC LIMIT 5"

# Q6: Revenue estimate per airline
run_query 6 "Revenue estimate per airline" \
  "SELECT c.CARRNAME, ROUND(SUM(f.PRICE * f.SEATSOCC),0) as est_revenue FROM flights_Flights f JOIN flights_Carriers c ON c.MANDT=f.MANDT AND c.CARRID=f.CARRID GROUP BY c.CARRNAME ORDER BY est_revenue DESC"

# Q7: Flights with >80% occupancy
run_query 7 "Flights with >80% occupancy" \
  "SELECT c.CARRNAME, cn.CITYFROM, cn.CITYTO, f.FLDATE, ROUND(CAST(f.SEATSOCC AS FLOAT)/f.SEATSMAX*100,1) as occ_pct FROM flights_Flights f JOIN flights_Carriers c ON c.MANDT=f.MANDT AND c.CARRID=f.CARRID JOIN flights_Connections cn ON cn.MANDT=f.MANDT AND cn.CARRID=f.CARRID AND cn.CONNID=f.CONNID WHERE f.SEATSMAX>0 AND CAST(f.SEATSOCC AS FLOAT)/f.SEATSMAX*100 > 80 ORDER BY occ_pct DESC LIMIT 10"

# Q8: Top travel agencies by bookings
run_query 8 "Which agencies book the most?" \
  "SELECT ta.NAME, COUNT(b.BOOKID) as bookings FROM flights_Bookings b JOIN flights_TravelAgencies ta ON ta.MANDT=b.MANDT AND ta.AGENCYNUM=b.AGENCYNUM GROUP BY ta.NAME ORDER BY bookings DESC LIMIT 10"

# Q9: Monthly booking trends
run_query 9 "Monthly booking trends" \
  "SELECT strftime('%Y-%m', f.FLDATE) as month, COUNT(b.BOOKID) as bookings FROM flights_Bookings b JOIN flights_Flights f ON f.MANDT=b.MANDT AND f.CARRID=b.CARRID AND f.CONNID=b.CONNID AND f.FLDATE=b.FLDATE GROUP BY month ORDER BY month"

# Q10: Multi-hop route analysis (self-join)
run_query 10 "Multi-hop routes (connecting flights)" \
  "SELECT c1.CITYFROM as origin, c1.CITYTO as layover, c2.CITYTO as destination, c1.DISTANCE+c2.DISTANCE as total_km FROM flights_Connections c1 JOIN flights_Connections c2 ON c2.MANDT=c1.MANDT AND c2.CITYFROM=c1.CITYTO WHERE c1.CITYFROM != c2.CITYTO ORDER BY total_km DESC LIMIT 10"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo " Results: $PASS passed, $FAIL failed (of $((PASS + FAIL)) queries)"
echo "═══════════════════════════════════════════════════════════"

[ $FAIL -eq 0 ] || exit 1
