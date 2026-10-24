# Archived context-prompt candidate (rejected)

`prompts.ts.txt` is the complete candidate source used for runs
`round-one-eval-e6QZyA` (neutral controls) and `round-one-eval-AfHfMu`
(multi-source development diagnostics). It is not imported by the application.
The candidate increased false alerts and failed debate-readiness gates.

For reproduction, use an isolated copy of the project, substitute this snapshot
for `src/ai/agents/document/prompts.ts`, then run:

```sh
npm run benchmark:round-one -- --manifest benchmark/data/context-controls-v2.json
npm run benchmark:round-one
```

Keep rule/model/transport/decision policy unchanged. Compare the hashes recorded
in the original run summaries. Restore the retained prompt after measurement;
do not deploy this candidate. Results vary between model runs. The controls are
authored development probes, not an independent benchmark.

See `docs/reports/thu-nghiem-chi-dan-va-ngu-canh.md` and
`docs/planning/tieu-chi-them-vong-phan-bien.md` from the project root.
