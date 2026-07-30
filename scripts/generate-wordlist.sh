#!/usr/bin/env bash
# Regenerates wordle/src/wordlist.ts — the offline dictionary of valid 5-letter
# guesses. To avoid accepting obscure Scrabble-only words (e.g. "aahed"), a word
# must be BOTH real AND common:
#   real   = present in dwyl/english-words (public domain)
#   common = present in the top-100k of the English frequency list
#            (hermitdave/FrequencyWords, MIT — built from OpenSubtitles)
# The intersection (~6.2k words) is deduped, sorted and packed as one string
# (every word is exactly 5 chars, concatenated with no separators) for a
# compact bundle.
#
# Usage: bash scripts/generate-wordlist.sh
set -euo pipefail

DICT_URL="https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt"
FREQ_URL="https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_full.txt"
FREQ_TOP=100000
OUT="$(cd "$(dirname "$0")/.." && pwd)/wordle/src/wordlist.ts"
DICT="$(mktemp)"; FREQ="$(mktemp)"; OUTLIST="$(mktemp)"

curl -fsSL "$DICT_URL" | tr -d '\r' | tr 'A-Z' 'a-z' | grep -E '^[a-z]{5}$' | sort -u > "$DICT"
curl -fsSL "$FREQ_URL" | head -"$FREQ_TOP" | awk '{print $1}' > "$FREQ"
# Keep words that are real (in DICT) and common (in top-N FREQ), then dedupe + sort.
awk 'NR==FNR{d[$1]=1;next} ($1 in d) && $1 ~ /^[a-z][a-z][a-z][a-z][a-z]$/{print $1}' \
  "$DICT" "$FREQ" | sort -u > "$OUTLIST"
echo "Real ∩ top-$FREQ_TOP five-letter words: $(wc -l < "$OUTLIST" | tr -d ' ')"

{
  echo "// Auto-generated offline dictionary of valid 5-letter guesses."
  echo "// Real AND common: dwyl/english-words (public domain) INTERSECT the top-100k of"
  echo "// the English frequency list (hermitdave/FrequencyWords, MIT — from OpenSubtitles)."
  echo "// This keeps everyday words while dropping obscure Scrabble-only entries (e.g. \"aahed\")."
  echo "// Packed as one string — every word is exactly 5 chars, concatenated (no separators)."
  echo "// Regenerate: bash scripts/generate-wordlist.sh"
  echo "export const PACKED_GUESSES ="
  awk '{a=a $0; c++; if(c%120==0){printf "  \x27%s\x27 +\n", a; a=""}} END{printf "  \x27%s\x27;\n", a}' "$OUTLIST"
} > "$OUT"

rm -f "$DICT" "$FREQ" "$OUTLIST"
echo "Wrote $OUT"
