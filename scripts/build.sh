#!/usr/bin/env bash
# Orthodox Zone - Developed by dgm at Holy Loch Media (dgm@tuta.com)
# orthodox.zone-web/scripts/build.sh

set -euo pipefail

go run ./cmd/ozbuild build --clean
