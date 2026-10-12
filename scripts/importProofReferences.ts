import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, recordActivity } from "../server/services/tenant";
import { companies, brandAssets } from "../drizzle/schema";
import { storagePut, storageGetSignedUrl } from "../server/storage";
const files = [
  {
    path: "/home/ubuntu/upload/1fe6adcd-5f43-46e5-be63-d536b74fb687.png",
    name: "Proof — homepage explorations / 01",
    note: "Owner-supplied Proof exploration board, 12 homepage directions. Inspiration: monumental serif statements, warm paper/ink, hairline rules, generous asymmetry, small signal markers, stone/landscape atmosphere. This historical exploration is not the official current Proof mark, not a shipped interface, and not a customer claim. Follow the current official Proof logo and sage accent instructions. Use as design inspiration, never embed this contact sheet in a prospect page.",
  },
  {
    path: "/home/ubuntu/upload/274b246e-7a67-48d8-87ea-c5eebf800ab5.png",
    name: "Proof — homepage explorations / 02",
    note: "Owner-supplied Proof exploration board, 12 additional homepage directions. Inspiration: large serif Done/Ship statements, considered change paths, numbered thin-rule lists, dark/light editorial contrast, tactile stone sphere, and quiet evidence-card compositions. This historical exploration is not the official current Proof mark, not a shipped interface, and not a customer claim. Preserve Proof official ink/paper/sage branding; red marks describe the exploration, not a new official logo. Use visual rhythm and layout as inspiration, not a literal collage.",
  },
];
async function main() {
  const d = await db();
  const [company] = await d
    .select()
    .from(companies)
    .where(eq(companies.slug, "proof"));
  if (!company || new URL(company.website).hostname !== "reqproof.com")
    throw new Error(
      "The expected existing Proof organization was not verified. No asset import performed."
    );
  let imported = 0;
  for (const file of files) {
    const bytes = readFileSync(file.path);
    if (
      !bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      bytes.length > 5 * 1024 * 1024
    )
      throw new Error("Expected a PNG smaller than 5 MB.");
    const hash = createHash("sha256").update(bytes).digest("hex");
    const tag = `Owner source sha256:${hash}`;
    const existing = await d
      .select()
      .from(brandAssets)
      .where(eq(brandAssets.companyId, company.id));
    const found = existing.find(a => a.note?.includes(tag));
    if (found) {
      console.log(
        JSON.stringify({
          name: found.name,
          id: found.id,
          url: found.url,
          status: "already stored",
        })
      );
      continue;
    }
    if (existing.length >= 12)
      throw new Error(
        "Organization visual reference capacity reached; no assets overwritten."
      );
    const asset = await storagePut(
      `companies/${company.id}/references/proof-explorations-${hash.slice(0, 16)}.png`,
      bytes,
      "image/png"
    );
    const signed = await storageGetSignedUrl(asset.key);
    const fetched = await fetch(signed);
    if (!fetched.ok)
      throw new Error("Uploaded reference could not be verified.");
    const uploaded = Buffer.from(await fetched.arrayBuffer());
    if (createHash("sha256").update(uploaded).digest("hex") !== hash)
      throw new Error(
        "Reference integrity verification failed. No database asset was stored."
      );
    const [saved] = await d.insert(brandAssets).values({
      companyId: company.id,
      name: file.name,
      key: asset.key,
      url: asset.url,
      mime: "image/png",
      note: `${file.note}\n${tag}`,
    });
    imported++;
    console.log(
      JSON.stringify({
        name: file.name,
        id: saved.insertId,
        url: asset.url,
        status: "original stored and checksum verified",
      })
    );
  }
  if (imported)
    await recordActivity(
      company.id,
      `${imported} owner-supplied Proof exploration boards added as visual inspiration. Official brand settings preserved.`,
      "brand"
    );
  process.exit(0);
}
main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
