#!/usr/bin/env bash
# Common functions and variables for all scripts

# get_repo_root returns the repository root path: the Git top-level when inside a repo, otherwise the directory three levels above this script's location.
get_repo_root() {
    if git rev-parse --show-toplevel >/dev/null 2>&1; then
        git rev-parse --show-toplevel
    else
        # Fall back to script location for non-git repos
        local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        (cd "$script_dir/../../.." && pwd)
    fi
}

# get_current_branch determines the current feature or branch name, preferring SPECIFY_FEATURE, then Git, then the latest three-digit-prefixed directory under specs/, and finally "main".
get_current_branch() {
    # First check if SPECIFY_FEATURE environment variable is set
    if [[ -n "${SPECIFY_FEATURE:-}" ]]; then
        echo "$SPECIFY_FEATURE"
        return
    fi

    # Then check git if available
    if git rev-parse --abbrev-ref HEAD >/dev/null 2>&1; then
        git rev-parse --abbrev-ref HEAD
        return
    fi

    # For non-git repos, try to find the latest feature directory
    local repo_root=$(get_repo_root)
    local specs_dir="$repo_root/specs"

    if [[ -d "$specs_dir" ]]; then
        local latest_feature=""
        local highest=0

        for dir in "$specs_dir"/*; do
            if [[ -d "$dir" ]]; then
                local dirname=$(basename "$dir")
                if [[ "$dirname" =~ ^([0-9]{3})- ]]; then
                    local number=${BASH_REMATCH[1]}
                    number=$((10#$number))
                    if [[ "$number" -gt "$highest" ]]; then
                        highest=$number
                        latest_feature=$dirname
                    fi
                fi
            fi
        done

        if [[ -n "$latest_feature" ]]; then
            echo "$latest_feature"
            return
        fi
    fi

    echo "main"  # Final fallback
}

# has_git determines whether the current directory is inside a Git repository.
has_git() {
    git rev-parse --show-toplevel >/dev/null 2>&1
}

# check_feature_branch validates a branch name matches the three-digit-prefix convention when running inside a Git repository; if no Git repo is detected it emits a warning and returns success.
# @param branch the branch name to validate.
# @param has_git_repo set to "true" if the environment is a Git repository; any other value is treated as not a Git repo.
# @returns 0 if the branch is valid or Git is not present, 1 if the branch does not start with a three-digit prefix followed by a dash (e.g., 001-feature-name).
check_feature_branch() {
    local branch="$1"
    local has_git_repo="$2"

    # For non-git repos, we can't enforce branch naming but still provide output
    if [[ "$has_git_repo" != "true" ]]; then
        echo "[specify] Warning: Git repository not detected; skipped branch validation" >&2
        return 0
    fi

    if [[ ! "$branch" =~ ^[0-9]{3}- ]]; then
        echo "ERROR: Not on a feature branch. Current branch: $branch" >&2
        echo "Feature branches should be named like: 001-feature-name" >&2
        return 1
    fi

    return 0
}

# get_feature_dir constructs and echoes the path to a feature directory under the given repository root; arguments are the repository root and the feature name (e.g., `001-feature`).
get_feature_dir() { echo "$1/specs/$2"; }

# Find feature directory by numeric prefix instead of exact branch match
# find_feature_dir_by_prefix finds the spec directory under the repository's specs/ that matches the three-digit numeric prefix of a branch name, falling back to specs/<branch_name> when no prefix or no unique match is found and emitting an error on ambiguous matches.
find_feature_dir_by_prefix() {
    local repo_root="$1"
    local branch_name="$2"
    local specs_dir="$repo_root/specs"

    # Extract numeric prefix from branch (e.g., "004" from "004-whatever")
    if [[ ! "$branch_name" =~ ^([0-9]{3})- ]]; then
        # If branch doesn't have numeric prefix, fall back to exact match
        echo "$specs_dir/$branch_name"
        return
    fi

    local prefix="${BASH_REMATCH[1]}"

    # Search for directories in specs/ that start with this prefix
    local matches=()
    if [[ -d "$specs_dir" ]]; then
        for dir in "$specs_dir"/"$prefix"-*; do
            if [[ -d "$dir" ]]; then
                matches+=("$(basename "$dir")")
            fi
        done
    fi

    # Handle results
    if [[ ${#matches[@]} -eq 0 ]]; then
        # No match found - return the branch name path (will fail later with clear error)
        echo "$specs_dir/$branch_name"
    elif [[ ${#matches[@]} -eq 1 ]]; then
        # Exactly one match - perfect!
        echo "$specs_dir/${matches[0]}"
    else
        # Multiple matches - this shouldn't happen with proper naming convention
        echo "ERROR: Multiple spec directories found with prefix '$prefix': ${matches[*]}" >&2
        echo "Please ensure only one spec directory exists per numeric prefix." >&2
        echo "$specs_dir/$branch_name"  # Return something to avoid breaking the script
    fi
}

# get_feature_paths prints a block of KEY='value' assignments describing repository and feature paths for the current branch.
# It determines repo root, current branch, and whether Git is available, resolves the feature directory using prefix-based lookup, and emits REPO_ROOT, CURRENT_BRANCH, HAS_GIT, FEATURE_DIR, FEATURE_SPEC, IMPL_PLAN, TASKS, RESEARCH, DATA_MODEL, QUICKSTART, and CONTRACTS_DIR.
get_feature_paths() {
    local repo_root=$(get_repo_root)
    local current_branch=$(get_current_branch)
    local has_git_repo="false"

    if has_git; then
        has_git_repo="true"
    fi

    # Use prefix-based lookup to support multiple branches per spec
    local feature_dir=$(find_feature_dir_by_prefix "$repo_root" "$current_branch")

    cat <<EOF
REPO_ROOT='$repo_root'
CURRENT_BRANCH='$current_branch'
HAS_GIT='$has_git_repo'
FEATURE_DIR='$feature_dir'
FEATURE_SPEC='$feature_dir/spec.md'
IMPL_PLAN='$feature_dir/plan.md'
TASKS='$feature_dir/tasks.md'
RESEARCH='$feature_dir/research.md'
DATA_MODEL='$feature_dir/data-model.md'
QUICKSTART='$feature_dir/quickstart.md'
CONTRACTS_DIR='$feature_dir/contracts'
EOF
}

# check_file tests whether the file at PATH exists and echoes "  ✓ LABEL" if it does or "  ✗ LABEL" if it does not; arguments are PATH (file path to check) and LABEL (text shown after the status).
check_file() { [[ -f "$1" ]] && echo "  ✓ $2" || echo "  ✗ $2"; }
# check_dir checks whether the given directory exists and contains at least one entry and echoes "  ✓ <label>" on success or "  ✗ <label>" on failure.
check_dir() { [[ -d "$1" && -n $(ls -A "$1" 2>/dev/null) ]] && echo "  ✓ $2" || echo "  ✗ $2"; }
