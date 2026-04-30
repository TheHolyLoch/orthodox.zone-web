#!/usr/bin/env bash
# Orthodox Zone - Developed by dgm at Holy Loch Media (dgm@tuta.com)
# orthodox.zone-web/scripts/deploy.sh

set -euo pipefail

DEPLOY_TARGET="${DEPLOY_TARGET:-/var/www/orthodox.zone/html}"
MODE="deploy"
REQUIRED_PATHS=(
	"go.mod"
	"cmd/ozbuild/main.go"
	"internal/site/site.go"
	"content"
	"templates"
	"assets"
	"scripts/build.sh"
)

usage() {
	printf 'usage: %s [--check|--dry-run]\n' "$0"
}

fail() {
	printf 'error: %s\n' "$1" >&2
	exit 1
}

parse_args() {
	if [ "$#" -gt 1 ]; then
		usage >&2
		fail "too many arguments"
	fi

	if [ "$#" -eq 0 ]; then
		return
	fi

	case "$1" in
		--check)
			MODE="check"
			;;
		--dry-run)
			MODE="dry-run"
			;;
		-h|--help)
			usage
			exit 0
			;;
		*)
			usage >&2
			fail "unknown argument: $1"
			;;
	esac
}

find_repo_root() {
	local search_dir

	search_dir="$(pwd)"

	while [ "$search_dir" != "/" ]; do
		if [ -f "$search_dir/go.mod" ] &&
			[ -d "$search_dir/content" ] &&
			[ -d "$search_dir/templates" ] &&
			[ -f "$search_dir/assets/css/style.css" ]; then
			printf '%s\n' "$search_dir"
			return
		fi

		search_dir="$(dirname "$search_dir")"
	done

	fail "script not run from a valid repo layout"
}

check_go() {
	if ! command -v go >/dev/null 2>&1; then
		fail "missing Go. Install Go before running the build"
	fi
}

check_source_paths() {
	local item

	for item in "${REQUIRED_PATHS[@]}"; do
		if [ ! -e "$REPO_ROOT/$item" ]; then
			fail "missing source file or directory: $item"
		fi
	done
}

check_target() {
	if [ ! -d "$DEPLOY_TARGET" ]; then
		fail "missing target directory: $DEPLOY_TARGET"
	fi

	if [ ! -w "$DEPLOY_TARGET" ]; then
		fail "target directory is not writable by current user: $DEPLOY_TARGET"
	fi
}

has_rsync() {
	command -v rsync >/dev/null 2>&1
}

print_plan() {
	printf 'source directory: %s\n' "$REPO_ROOT/public"
	printf 'deploy target: %s\n' "$DEPLOY_TARGET"

	if has_rsync; then
		printf 'copy method: rsync\n'
	else
		printf 'copy method: cp fallback\n'
	fi
}

run_build() {
	(
		cd "$REPO_ROOT"
		./scripts/build.sh
	)
}

run_check() {
	check_go
	check_source_paths
	check_target
	print_plan

	if has_rsync; then
		printf 'rsync available: yes\n'
	else
		printf 'rsync available: no\n'
	fi

	printf 'check complete. no files copied.\n'
}

run_cp_fallback() {
	if [ "$MODE" = "dry-run" ]; then
		printf 'rsync unavailable. cp fallback would copy:\n'
		(
			cd "$REPO_ROOT/public"
			find . -maxdepth 3 -type f | sort
		)
		printf 'warning: old removed files may remain without rsync.\n'
		return
	fi

	printf 'warning: rsync unavailable. old removed files may remain without rsync.\n'
	cp -R "$REPO_ROOT/public"/. "$DEPLOY_TARGET"/
}

run_rsync() {
	local -a dry_run_flag

	dry_run_flag=()
	if [ "$MODE" = "dry-run" ]; then
		dry_run_flag=(--dry-run)
	fi

	rsync -av --delete "${dry_run_flag[@]}" "$REPO_ROOT/public"/ "$DEPLOY_TARGET"/
}

run_deploy() {
	check_go
	check_source_paths
	check_target
	run_build
	print_plan

	if has_rsync; then
		run_rsync
	else
		run_cp_fallback
	fi

	if [ "$MODE" != "dry-run" ]; then
		printf 'deployed files:\n'
		find "$DEPLOY_TARGET" -maxdepth 3 -type f | sort
		printf 'nginx is not reloaded by this script. Static file changes should be served automatically.\n'
	fi
}

parse_args "$@"
REPO_ROOT="$(find_repo_root)"

if [ "$MODE" = "check" ]; then
	run_check
else
	run_deploy
fi
