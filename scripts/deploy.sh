#!/usr/bin/env bash
# Orthodox Zone - Developed by dgm (dgm@tuta.com)
# orthodox.zone-web/scripts/deploy.sh

set -euo pipefail

DEPLOY_TARGET="${DEPLOY_TARGET:-/var/www/orthodox.zone/html}"
MODE="deploy"
REQUIRED_FILES=(
	"index.html"
	"about.html"
	"connect.html"
	"orthocal.html"
	"resources.html"
	"saints.html"
	"contact.html"
	"assets"
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
		if [ -f "$search_dir/index.html" ] &&
			[ -f "$search_dir/assets/css/style.css" ] &&
			[ -f "$search_dir/assets/js/main.js" ]; then
			printf '%s\n' "$search_dir"
			return
		fi

		search_dir="$(dirname "$search_dir")"
	done

	fail "script not run from a valid repo layout"
}

check_source_files() {
	local item

	for item in "${REQUIRED_FILES[@]}"; do
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
	printf 'source directory: %s\n' "$REPO_ROOT"
	printf 'deploy target: %s\n' "$DEPLOY_TARGET"

	if has_rsync; then
		printf 'copy method: rsync\n'
	else
		printf 'copy method: cp fallback\n'
	fi
}

make_staging_dir() {
	local item
	local staging_dir

	staging_dir="$(mktemp -d)"

	for item in "${REQUIRED_FILES[@]}"; do
		cp -R "$REPO_ROOT/$item" "$staging_dir/"
	done

	printf '%s\n' "$staging_dir"
}

run_check() {
	check_source_files
	check_target
	print_plan

	if has_rsync; then
		printf 'rsync available: yes\n'
	else
		printf 'rsync available: no\n'
	fi

	printf 'check complete. no files copied.\n'
}

run_rsync() {
	local -a dry_run_flag
	local staging_dir

	dry_run_flag=()
	if [ "$MODE" = "dry-run" ]; then
		dry_run_flag=(--dry-run)
	fi

	staging_dir="$(make_staging_dir)"
	trap "rm -rf '$staging_dir'" EXIT

	rsync -av --delete "${dry_run_flag[@]}" \
		--exclude='.git/' \
		--exclude='.gitignore' \
		--exclude='README.md' \
		--exclude='LICENSE' \
		--exclude='scripts/' \
		--exclude='AGENTS.md' \
		--exclude='*.bak' \
		--exclude='*.tmp' \
		--exclude='logs/' \
		--exclude='node_modules/' \
		--exclude='.DS_Store' \
		"$staging_dir"/ "$DEPLOY_TARGET"/

	rm -rf "$staging_dir"
	trap - EXIT
}

run_cp_fallback() {
	local staging_dir

	staging_dir="$(make_staging_dir)"
	trap "rm -rf '$staging_dir'" EXIT

	if [ "$MODE" = "dry-run" ]; then
		printf 'rsync unavailable. cp fallback would copy:\n'
		(
			cd "$staging_dir"
			find . -maxdepth 3 -type f | sort
		)
		printf 'warning: old removed files may remain without rsync.\n'
		rm -rf "$staging_dir"
		trap - EXIT
		return
	fi

	printf 'warning: rsync unavailable. old removed files may remain without rsync.\n'
	cp -R "$staging_dir"/. "$DEPLOY_TARGET"/
	rm -rf "$staging_dir"
	trap - EXIT
}

run_deploy() {
	check_source_files
	check_target
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
