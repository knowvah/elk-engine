# shellcheck shell=bash
# SPDX-License-Identifier: EPL-2.0
# How a recorder program of tools/vectors is built and started (issue #50; plans/vector-recorder-debts D1). Sourced by
# vector-cache.sh, layered-loops-vectors.sh and tools/oracle/loops-sweep.sh; not executed.
# A program tools/vectors/<P>.java is one of two kinds:
#   single-file  no directory tools/vectors/<P>/ exists. It runs through the JDK's source launcher,
#                `java [<option>...] -cp <classpath> <P>.java <argument>...`, exactly as before this helper existed:
#                the launcher compiles inside the recording JVM, and a recorder whose script does not pin
#                -XX:hashCode=2 may depend on that (.agent-notes/recorder-identity-hash.md).
#   multi-file   the directory exists and holds the program's other sources (default package, any depth). JDK 21's
#                launcher takes one file, so javac compiles <P>.java and every *.java under <P>/ into a fresh
#                directory under $TMPDIR, `java [<option>...] -cp <classes>:<classpath> <P> <argument>...` runs the
#                class, and the directory is removed when the program ends. Starting such a program with
#                `java <P>.java` fails to compile.
# javac runs in the caller's environment, so a script's JAVA_TOOL_OPTIONS reaches it as it reached the launcher's
# compile; it uses the JDK's default source level, as the launcher does. Its stdout goes to stderr.
#   jp_sources <program.java>   the program's sources, one path per line: the entry, then the helpers in C-locale path
#                               order. Salts and stamps hash this list.
#   jp_run java <command line>  runs a source-launcher command line: `jp_run java -cp "$cp" "$program" "$@"`. Every
#                               JVM option before the program is one word, except -cp/-classpath/--class-path, which
#                               takes the next word. Returns the program's exit status (a failed compile: javac's).
# VC_JAVA_PROGRAM is this file's path: it decides how a program is built, so vc_salt and the loops sweep stamp hash it.
# Expects nothing from the caller but bash and PATH.

# shellcheck disable=SC2034 # read by the scripts that source this file
VC_JAVA_PROGRAM="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/java-program.sh"
JP_EXIT_USAGE=2
JP_JAVAC_OPTIONS=(-encoding UTF-8 -proc:none -implicit:class)

jp_sources() { # jp_sources <program.java>
  local program="$1" dir="${1%.java}"
  echo "$program"
  [ -d "$dir" ] || return 0
  find "$dir" -type f -name '*.java' | LC_ALL=C sort
}

jp_usage() { # jp_usage <message>
  echo "error: jp_run $1" >&2
  return "$JP_EXIT_USAGE"
}

jp_run() { # jp_run java [<option>...] [-cp <classpath>] <program.java> [<argument>...]
  local argv=("$@") i cp_at=-1 program_at=-1
  [ "${1:-}" = java ] || { jp_usage "takes a java command line, not: $*"; return; }
  for ((i = 1; i < ${#argv[@]}; i++)); do
    case "${argv[i]}" in
      -cp | -classpath | --class-path) cp_at=$((++i)) ;;
      -*) ;;
      *)
        program_at=$i
        break
        ;;
    esac
  done
  case "${argv[program_at]}" in *.java) ;; *) program_at=-1 ;; esac
  [ "$program_at" -gt 0 ] || { jp_usage "found no <Program>.java in: $*"; return; }
  if [ ! -d "${argv[program_at]%.java}" ]; then
    "$@"
    return
  fi
  jp_run_compiled "$cp_at" "$program_at" "$@"
}

# jp_run_compiled <index of the classpath word, or -1> <index of the program word> <java command line>
# A subshell, so that its EXIT trap removes the classes however the program ends and no trap of the caller is replaced.
jp_run_compiled() (
  cp_at="$1" program_at="$2"
  shift 2
  argv=("$@")
  program="${argv[program_at]}"
  sources=()
  while IFS= read -r source; do
    sources+=("$source")
  done < <(jp_sources "$program")
  classes="$(mktemp -d "${TMPDIR:-/tmp}/java-program.XXXXXX")" || exit
  trap 'rm -rf "$classes"' EXIT
  if [ "$cp_at" -gt 0 ]; then
    javac "${JP_JAVAC_OPTIONS[@]}" -cp "${argv[cp_at]}" -d "$classes" "${sources[@]}" >&2 || exit
    argv[cp_at]="$classes:${argv[cp_at]}"
    argv[program_at]="$(basename "$program" .java)"
    "${argv[@]}"
  else
    javac "${JP_JAVAC_OPTIONS[@]}" -d "$classes" "${sources[@]}" >&2 || exit
    "${argv[@]:0:program_at}" -cp "$classes" "$(basename "$program" .java)" "${argv[@]:program_at+1}"
  fi
)
