# TailorPitch: hosted title and Cloudflare domain setup

## Current status

TailorPitch's application and landing page use the new name. The separate Manus-hosted sign-in screen still displays **“Leadloom — Personalized Lead Workspace”** because it reads the website's platform title, not the React page title. Changing local text or environment variables cannot truthfully establish that this hosted label has changed.

The current session reports the Cloudflare connector as **disabled / authorization required**, even though the owner reports granting access. No Cloudflare account operations have been performed. This is the session state observed, not a claim that the owner did not approve access elsewhere.

The app is saved and available in Preview; it has not yet been published or bound to `tailorpitch.com`. **Do not point DNS to the temporary Preview hostname.**

## 1. Correct the hosted sign-in name

In this task's website Dashboard, open website settings and change the website's display title to **TailorPitch** (the website title, not only the conversation title). If the Dashboard does not expose that field, the documented account API operation is:

```http
POST https://api.manus.ai/v2/website.update
Content-Type: application/json
x-manus-api-key: <your account API key>

{"task_id":"yn1XVCD2sWNhDKACtnREJK","title":"TailorPitch"}
```

This updates website metadata without publishing or changing visibility. Keep the key private; use a protected credential field, never chat. The existing app's project-service key is not an interchangeable account API key. Refresh the sign-in flow after success and verify the actual label.

## 2. Publish the saved app

In the TailorPitch website Dashboard, publish the current saved version. Keep company data protected by the existing login. Publication makes the public marketing page reachable; it does not automatically send outreach, run scraping, or enable a recurring pipeline. Wait for publication success and its permanent URL.

## 3. Obtain the exact domain records from Manus

Open **Custom domain / Connect an existing domain** in the website Dashboard and enter `tailorpitch.com`. Add `www.tailorpitch.com` separately only if you want both hostnames served. Copy the exact DNS records displayed by Manus, including any ownership-verification TXT record.

The DNS targets are website-specific and are **not yet available in this session**. No generic A address, guessed CNAME, or Preview target should be substituted.

## 4. Add those records in Cloudflare

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/), choose **tailorpitch.com**, then **DNS → Records**.
2. Export or record current DNS before changing overlapping website records. Preserve all mail-related MX/TXT records and unrelated subdomains.
3. Select **Add record**, then enter the exact type, name and content from Manus. Cloudflare uses `@` for the apex and `www` for the `www` hostname. For a full verification hostname, preserve the exact label shown.
4. For A/AAAA/CNAME records, use **DNS only** (gray cloud) during initial verification unless Manus explicitly instructs otherwise. Set **TTL: Auto**. TXT verification records are not proxyable.
5. If an existing A/AAAA/CNAME conflicts at the same hostname, inspect its purpose before replacing it; do not delete unrelated records.
6. Save, then return to Manus and select **Verify / Connect**. Allow DNS propagation and certificate issuance to complete.

| If Manus requests | Cloudflare type | Name | Content |
| --- | --- | --- | --- |
| Apex address | A or AAAA, exactly as issued | `@` | Exact issued address — not provided yet |
| Apex alias | CNAME | `@` | Exact issued hostname — not provided yet |
| WWW alias | CNAME | `www` | Exact issued hostname — not provided yet |
| Ownership verification | TXT | Exact issued verification label | Exact issued verification value — not provided yet |

**Do not add every example row. Add only the records the domain panel actually requests.**

## 5. Verify and finish app settings

Confirm `https://tailorpitch.com` shows TailorPitch over valid HTTPS and the login works. Check `www` independently if configured. Set the company's public origin to `https://tailorpitch.com` only after it is verified; saving an origin is not DNS binding.

For Gmail OAuth, add `https://tailorpitch.com/api/mailbox/gmail/callback` to the Google OAuth client's allowed redirect URIs **only if it matches the callback actually displayed by the app's setup**. The implemented Gojiberry callback is `https://tailorpitch.com/api/integrations/gojiberry/callback`; reconnect from the final domain so registration and state use that origin. Existing refresh credentials stay encrypted per company.

DNS observation on October 12, 2026: the apex uses Cloudflare nameservers `dan.ns.cloudflare.com` and `iris.ns.cloudflare.com`; the public resolver returned no apex A, AAAA or CNAME answer. This confirms Cloudflare delegation, not working website routing.

Once published and connected, configure provider credentials and explicitly enable the pipeline and its recurring schedule. Initial discovery pace is up to 3 candidates/day, one candidate per turn, a minimum 240-minute interval and a weekday local 09:00–17:00 discovery window. Pages remain private drafts until publication; outreach is not sent automatically.

## References

- [Manus website metadata API](https://open.manus.ai/docs/v2/website.update)
- [Manus custom domains](https://manus.im/docs/website-builder/custom-domains)
- [Cloudflare DNS record management](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/)
