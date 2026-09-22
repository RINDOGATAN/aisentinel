# Status and support

What a pilot user needs to know when something goes wrong. The same text is
published in the application at `/docs/support`, which every error page links
to (`src/app/docs/support/page.tsx`).

## How to report a problem

Use the feedback form inside the application: the Feedback button at the top
of every page, or Feedback in the side menu on a phone. On the hosted service
the message reaches the owner's daily digest. On a self-hosted instance it is
stored in that instance's database for its administrator.

Say what you were doing, what you expected and what happened instead, and
include the reference if an error page showed one.

## The reference on an error page

Every error page and every failed action shows a short reference:

- `E-XXXXXXXX` for a failure in the browser or in a procedure. The server log
  line for a failed procedure starts with `[error E-XXXXXXXX]`.
- `D-<digits>` for a failure while the server rendered the page. The digits
  are the `digest` that Next.js prints next to the error in the server log.

The reference carries nothing about the person or their records. It only
joins a report to its log line.

## Exports are always available

An error page means one page or one action failed; nothing saved is deleted
or changed. Exports (the program pack and the PDF reports) stay available,
including on the hosted pilot after the editing period ends: the pilot's
read-only switch never touches a query or an export route (proven in
`src/server/routers/__tests__/pilot-read-and-export.test.ts`).

## Is the service up?

`GET /api/health` answers 200 only when the database answers within two
seconds and its last applied migration is the last one the build ships;
otherwise 503 with `reason` set to `database` or `migrations`. It also reports
the commit and the version.
