# Amazon SES migration handoff

Last verified: **5 October 2026**. Resume on 6 October from the AWS review check below.

**Production-access application submitted; AWS review pending. Live mail remains on Resend.** This branch records preparation only: no mail transport, Worker secrets, deployment, application limits or recipient preferences were changed during SES setup.

## Completed

| Item | Verified state |
| --- | --- |
| AWS account | Created by the owner; paid account plan selected. |
| SES region | **Europe (Ireland), `eu-west-1`**. Identities and the production-access request are in this region. |
| Email identity | Owner's email address verified. |
| Sending domain | **`modwerk.app` verified** by SES after publishing all three Easy DKIM CNAMEs in Hetzner. DKIM signing enabled with 2048-bit keys. |
| DNS | Three CNAMEs added with the owner's approval; all resolved at Hetzner's authoritative nameserver and public resolver `1.1.1.1`. Exact public records are saved in [ses-dkim.csv](ses-dkim.csv). |
| Existing services | Website records, inbound MX, root SPF, DMARC and Resend records preserved. Existing `_dmarc` value is `v=DMARC1; p=none;`; no duplicate was added. |
| SES pricing | Saved plan changed from the default Essentials to **à la carte**. The console confirmed the change. Base outbound price observed was $0.10/1,000 emails, plus applicable data charges; see [AWS pricing](https://aws.amazon.com/ses/pricing/). |
| Optional features | VDM, automatic email validation, dedicated IPs and tenants disabled in setup. Shared IPs selected. |
| Suppression | Account-level suppression enabled for **bounces and complaints**. |
| Feedback | Domain email feedback forwarding enabled. **No SNS destination or application feedback integration exists.** A monitored destination must be configured before live SES sending. |
| Application | Submitted successfully as **Transactional**, website `https://modwerk.app`, contact language English. Console showed **“Wird geprüft” / under review**. |

The onboarding wizard's à la carte selection did not persist initially. The saved pricing page still showed Essentials; cancelling that plan changed the saved account to à la carte immediately. Recheck the actual pricing page when resuming.

No AWS access key or SMTP credential was created. No credentials, account IDs or private console screenshots are stored in this branch. The DKIM records are public DNS data.

## Agreed sending scope

The owner approved AWS's service terms/AUP and the application's acknowledgement for **user-requested account verification and password recovery**. The owner agreed to review SES bounce/complaint metrics and keep automatic suppression enabled.

- **Wait for AWS production approval before changing live sending.** Domain verification is already complete; production approval is still separate.
- Activity digests remain on Resend until explicit activity-email opt-in is implemented. Current default-enabled activity preferences must not be described as explicit opt-in. Newsletter/news consent is separate.
- New-member welcome mail also remains on Resend: it was not included in the approved initial SES scope.
- Do not claim automated SES bounce/complaint processing is already implemented, or invent a daily volume, recipient count or delivery history for AWS.

## First action tomorrow: check AWS review

1. Open the [SES account dashboard in Ireland](https://eu-west-1.console.aws.amazon.com/ses/home?region=eu-west-1#/account). Inspect production-access status, actual daily sending quota and sending rate; do not assume the sandbox's 200/day and 1/second are the approved quotas.
2. Check the account owner's AWS email/support correspondence. [AWS documents an initial response within 24 hours](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html); requests needing more information can take longer.
3. If still under review, leave Resend live. Respond to any AWS information request accurately; do not create another regional application to bypass the review.
4. If approved, proceed with the implementation tasks below. Approval alone does not migrate the application.

If AWS asks about the use case: Modwerk is a firmware-module community for Elektron instruments. Verification follows registration or a resend request; recovery follows a user's password-reset request. The initial SES integration will send these account messages only. Other existing mail continues through Resend. SES suppression is enabled; the operator will review bounce/complaint metrics, stop sending to affected recipients and keep suppression enabled. Configure feedback to a monitored mailbox before sending through SES. Do not describe this manual process as an already deployed webhook.

## Implementation still to do

### 1. Prepare credentials and operational feedback

- Create a least-privilege sending identity restricted to the required SES send action(s), verified `modwerk.app` identity and `eu-west-1`. Use a dedicated IAM principal rather than root credentials. Store secrets through Wrangler's interactive secret input; never in Git, frontend variables, logs or PR text.
- Choose and prove a monitored bounce/complaint destination. Existing domain-only Hetzner registration/default MX does not establish a working `accounts@modwerk.app` mailbox. Email feedback forwarding being enabled is insufficient if it goes to an unmonitored sender address. Use a verified monitored feedback address or a confirmed event-notification destination; see [SES notifications](https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-activity-using-notifications.html).
- Keep suppression for hard bounces and complaints. Document the routine for reviewing reputation/suppression, handling complaints and pausing sending on unexpected problems; never retry permanently bounced or complained addresses.
- Preserve the current no-tracking and enforced-TLS sending policy when configuring SES. Verify SES's actual TLS settings; selecting à la carte does not prove them.
- Custom MAIL FROM was left unset. Decide whether it is needed for the chosen authentication/feedback design. If adding one, use a separate unused subdomain and copy AWS's exact records; `send` and `rsend` are currently used by Resend. Preserve the working root MX, SPF and existing DMARC policy.

### 2. Implement transport selection by message purpose

| File | Relevant current behavior / work |
| --- | --- |
| `server/email.ts` | Verification/recovery call Resend directly; `emailReady` requires `RESEND_API_KEY` and `EMAIL_FROM`. Add SES account-mail support with provider-specific readiness and failure handling. |
| `server/activity-mail.ts` | Calls Resend directly and imports shared `emailReady`. Keep it on Resend during the initial migration. Selection currently permits missing/default preferences (`COALESCE(p.email_enabled,1)=1`). |
| `server/welcome-mail.ts` | Current main contains Resend welcome delivery, persistent claims/retries and a 24-hour Resend idempotency assumption. Keep it on Resend; do not silently route it to SES through shared helpers. |
| `server/platform.ts`, `.dev.vars.example` | Add only the needed server-side configuration and document local setup. Keep credentials out of sample values. |
| `wrangler.worker.jsonc` | Region/provider variables and budgets belong here as appropriate; secret values do not. |
| `server/notifications.ts`, `migrations/0024_activity_notifications.sql`, `src/community/notification-contract.ts` | A later digest migration needs explicit opt-in, including a policy for existing default-enabled members. Preserve settings and one-click unsubscribe. |
| `src/legal/policy.ts`, `docs/LEGAL_COMPLIANCE.md`, `docs/DOMAIN_AND_MAIL.md`, `docs/COMMUNITY_OPERATIONS.md` | Before SES live use, update provider disclosures and operational instructions after reviewing AWS processing terms, region, transfers and retention. |

Preserve HTML/plain-text templates, Reply-To, account-link destinations, ten-second timeout/error containment, non-enumerating account responses and aggregate accepted/failed/limited counters. Provider acceptance is not proof of inbox delivery. Resend's `Idempotency-Key` header and retry guarantees must not be assumed to work with SES; choose and test duplicate/uncertain-delivery handling for the new transport. Never send through a second provider automatically after an uncertain result.

### 3. Revisit quotas after transport and AWS limits are known

Verification/recovery and welcome mail currently share application limits of **80/day and 2,400 per 30-day bucket**. Digests use `ACTIVITY_MAIL_DAILY_LIMIT=15`, with a monthly cap of 30 times that value. These are application guardrails built around Resend's free tier, not live readings of provider allowance or exact billing windows.

Moving account mail will not automatically remove these limits. Design budgets/rate limiting for the separate providers using actual approved SES quotas and the remaining Resend traffic. Keep appropriate abuse limits and failed-attempt accounting. Do not raise digest limits merely because SES is approved while those digests still use Resend.

### 4. Validate, stage, then switch with owner approval

- Extend the existing `src/community/account-mail.test.ts` and related tests for provider selection/readiness, rejection, timeout, rate limits and uncertain delivery. Prove digests and welcome mail still use Resend. Exercise feedback/suppression with the SES mailbox simulator where appropriate.
- Run the repository-required **`npm run check` before each commit** on Node 24, plus any meaningful transport-specific checks.
- Test verification and recovery end to end in an isolated/local Worker with controlled inboxes. Check inbox/spam placement, SPF/DKIM/DMARC, correct links, token replay/expiry, password recovery and the unchanged disclosure of account membership.
- Stage a Worker version and secrets without releasing it. Record the current deployed Worker version and rollback procedure before cutover. Avoid deploying a secret-only version without its matching transport code.
- Open/review the implementation PR. **Merging runtime changes to `main` can automatically deploy the Worker** through `.github/workflows/worker.yml`; its paths include `server/**`, `migrations/**`, `worker.ts`, `wrangler.worker.jsonc`, `package-lock.json` and `src/legal/**`.
- Switch only after AWS approval, required feedback/disclosures and delivery checks are complete, and the owner approves release. Monitor initial failures and reputation. Roll back to the recorded Worker version/Resend configuration if needed.
- Keep the Resend key and DNS records while digests or welcomes still use it. Retire only credentials/services no remaining purpose needs. Do not rotate `AUTH_SECRET` as part of a provider change.

## Resume this branch

Branch: **`codex/ses-migration-handoff`**, based on current `origin/main` at `9673637` when created. The original checkout's unrelated uncommitted edits were preserved in place; they are not part of this handoff.

```sh
git fetch origin
git switch codex/ses-migration-handoff
```

Use a clean checkout or open the attached SES handoff worktree. Before implementation, update/rebase onto current main and reread the relevant files: welcome-mail work has already landed since the older checkout used during setup.

Suggested next-session prompt:

> Continue from docs/SES_MIGRATION.md on codex/ses-migration-handoff. First check SES production approval in eu-west-1 and any AWS follow-up. Keep Resend live until approval and validated owner-approved release. Initially migrate only requested verification/password-reset mail; digests and welcomes stay on Resend. Implement and test provider-specific readiness, feedback, safe delivery handling and rollback before proposing a live switch.
