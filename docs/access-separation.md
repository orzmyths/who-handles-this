# Resident privacy and staff access

The owner approved Clerk accounts, an explicit owner-managed staff allowlist,
and preserving unowned demo reports as unassigned and staff-only.

## Grant or revoke a reviewer

No account becomes staff automatically, including the first account or the app
creator. The allowlist starts empty. There is no public role-management endpoint.

1. The reviewer creates an account and opens **My account** to obtain their
   Clerk account ID.
2. The workspace owner verifies that this is the intended reviewer.
3. In the workspace shell, run:

   ```
   pnpm --filter @workspace/api-server staff:access grant user_ACCOUNT_ID
   ```

   The command checks that the account exists in the configured Clerk tenant
   before adding it. To remove approval:

   ```
   pnpm --filter @workspace/api-server staff:access revoke user_ACCOUNT_ID
   ```

Every staff API request checks the database allowlist again. Revocation does not
wait for a cached role or session to expire. Grant/revoke commands require trusted
workspace access, not merely an authenticated app account.

## Identity and report ownership

New saved reports receive the server-verified Clerk account ID. Client-supplied
owner IDs and roles are never trusted. History queries filter by that ID in the
database. Staff actions return 401 without sign-in and 403 for residents who are
not approved. New case decisions, contact corrections, baseline confirmations,
and demo reset logs record the authenticated reviewer's stable account ID.
System-created cases are labeled as system events, not human decisions.

Signing out or switching accounts discards the old account's query cache and
resident form state. Private API responses are marked no-store.

## Approved legacy policy

Existing reports remain unchanged with a NULL owner. They appear only in the
staff queue's **Unassigned legacy reports** section; existing review cases remain
staff-only. Existing audit entries retain their historical labels. No record is
deleted or assigned to the first account, and no automatic ownership-claim API
exists. The explicit demo-reset action still resets only seeded demo cases; it
does not remove resident reports or legacy routing history.

The shared-passcode verification endpoint is retired and returns 410. Old
passcode cookies cannot authenticate any protected API.

## Owner-operated evaluation checks

The civic evaluation scripts no longer use the shared passcode. Select a
pre-existing dedicated development evaluator account with the non-secret
`CIVIC_EVALUATION_USER_ID` environment variable before running `pnpm evaluate:civic`.
These trusted workspace commands use Clerk's backend SDK to create a temporary
session, refresh its token for each request, and revoke the session on completion
or failure. They create neither accounts nor staff approval and save no session
credentials in the reports. Use a dedicated evaluator account, not a resident's
personal account.

The routing regression harness uses a separately signed local fixture and a
mocked browser SDK only inside its isolated test proxy. Application sign-in and
privacy are tested separately against the real Clerk setup.

## Publishing

Development and production Clerk accounts are separate. Apply the additive
database migration before serving the updated API, and approve production
reviewers explicitly against the production Clerk tenant/database using a trusted
operator environment. Do not copy development approvals into production.

The schema changes add nullable routing-history ownership, a reviewer allowlist,
and a nullable reviewer ID on reset logs. They do not backfill or delete data.
The SQL in `lib/db/migrations/access-separation.sql` is idempotent and additive.
This work configures development; it does not publish the application.
