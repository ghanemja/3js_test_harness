// Reviewed exceptions to the house rules (tests/baseline/exceptions.json): things that are MEANT to
// break a rule (bunting hangs in the air, a cyclist's feet are on the pedals), each with a reason.
// A rule's offenders are compared with the list: a NEW offender fails, a listed one passes, and a
// listed one that no longer occurs is reported so the list stays honest.
// Re-record after reviewing: UPDATE_EXCEPTIONS=1 node --test tests/<suite>.test.mjs, then fill in every "why".
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const FILE = new URL('../baseline/exceptions.json', import.meta.url).pathname;
export const UPDATE = !!process.env.UPDATE_EXCEPTIONS;

export function exceptionsFor() {
  const all = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {};
  const touched = new Set(), report = {};
  return {
    all, report,
    /** match(offender, listed) — optional: how an offender is matched to a listed exception (default: same key) */
    judge(rule, offenders, keyOf, t, match = (o, k) => keyOf(o) === k.key) {
      report[rule] = offenders; touched.add(rule);
      const known = all[rule] ?? [];
      if (UPDATE) { all[rule] = offenders.map((o) => ({ key: keyOf(o), why: known.find((k) => k.key === keyOf(o))?.why ?? 'TODO: say why this is allowed', seen: o })); return; }
      const fresh = offenders.filter((o) => !known.some((k) => match(o, k)));
      const gone = known.filter((k) => !offenders.some((o) => match(o, k)));
      if (gone.length) t?.diagnostic(`${rule}: ${gone.length} listed exception(s) no longer occur — prune them: ${gone.map((k) => k.key).join(', ')}`);
      assert.deepEqual(fresh, [], `${rule}: new offenders (fix them, or if intended add them to tests/baseline/exceptions.json with a reason)`);
    },
    /** write back (UPDATE only): rules this suite judged are replaced, other suites' rules kept as they were */
    save() {
      if (!UPDATE) return;
      const now = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {};
      for (const r of touched) now[r] = all[r];
      writeFileSync(FILE, JSON.stringify(now, null, 2) + '\n');
      console.log(`exceptions re-recorded for ${[...touched].join(', ')} — fill in every "why"`);
    },
  };
}
