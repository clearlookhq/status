# Incidents

One file per incident, named `YYYY-MM-DD-short-name.md`:

```md
# Sign-ins were slow
Status: resolved

Between 14:05 and 14:40 UTC, sign-in codes took up to 3 minutes to arrive. Our email provider was
delayed. Nothing was lost. We now show a "code is on its way" note after 30 seconds.
```

Status is `investigating`, `monitoring` or `resolved`. Write in plain words what people saw, when, why,
and what changed. Anything over 30 minutes gets a short follow-up paragraph. Pushing a file republishes
the page at once.
