#!/usr/bin/env bash
set -euo pipefail

SOURCE="${BASH_SOURCE[0]}"
while [ -L "$SOURCE" ]; do 
  DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE" 
done
BINARY_DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"

VERSION=$(node -e "console.log(require('$BINARY_DIR/../package.json').version)")

case "${1:-}" in
  --version|-v)
    echo "dx-flow v$VERSION"
    exit 0
    ;;
  
  run)
    echo ""
    echo "  🛡️  DX-FLOW v$VERSION"
    echo "  ---------------------------"
    echo "  Checking systems..."
    echo ""

    shift
    SETUP_SCRIPT="$BINARY_DIR/../scripts/dx-flow-setup.mjs"
    if [ ! -f "$SETUP_SCRIPT" ]; then
      echo "❌ Setup file not found : $SETUP_SCRIPT"
      exit 1
    fi
    node "$SETUP_SCRIPT" "$@"
    ;;

  *)
    echo "Usage: dx-flow <command> [options]"
    echo ""
    echo "Commands:"
    echo "  run [--force] [dir]"
    echo ""
    echo "Options:"
    echo "  --version, -v"
    exit 1
    ;;
esac
