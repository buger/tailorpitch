import type { Express } from "express";
import { and, eq } from "drizzle-orm";
import { brandAssets, pages } from "../../drizzle/schema";
import { db, requireCompany } from "./tenant";
import { sdk } from "../_core/sdk";
import { storageGetSignedUrl } from "../storage";
export function validStorageKey(key: string) {
  return (
    key.length > 0 &&
    key.length <= 1000 &&
    /^[A-Za-z0-9_./-]+$/.test(key) &&
    key.split("/").every(part => part && part !== "." && part !== "..")
  );
}
export function registerCloudStorage(app: Express) {
  if (process.env.TAILORPITCH_CLOUD_STORAGE !== "1") return;
  app.get<{ 0: string }>("/manus-storage/*", async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    const key = String(req.params[0] || "");
    if (!validStorageKey(key)) {
      res.status(404).end();
      return;
    }
    const path = `/manus-storage/${key}`;
    let authorized = false;
    try {
      const d = await db();
      const token = req.query.page;
      if (typeof token === "string" && /^[a-f0-9]{32,64}$/.test(token)) {
        const [page] = await d
          .select()
          .from(pages)
          .where(
            and(eq(pages.shareToken, token), eq(pages.status, "published"))
          )
          .limit(1);
        authorized = !!page && page.brandSnapshot.logoUrl === path;
      }
      if (!authorized) {
        try {
          const user = await sdk.authenticateRequest(req);
          const workspace = await requireCompany(user);
          const [asset] = await d
            .select({ id: brandAssets.id })
            .from(brandAssets)
            .where(
              and(
                eq(brandAssets.companyId, workspace.company.id),
                eq(brandAssets.key, key)
              )
            )
            .limit(1);
          authorized = !!asset || workspace.company.brand.logoUrl === path;
        } catch {
          /* Unauthorized reads never obtain a signed URL. */
        }
      }
      if (!authorized) {
        res.status(404).end();
        return;
      }
      const url = await storageGetSignedUrl(key);
      if (new URL(url).protocol !== "https:") throw Error("Unsafe storage URL");
      res.redirect(307, url);
    } catch {
      res
        .status(503)
        .json({ error: "This asset could not be loaded. Please try again." });
    }
  });
}
