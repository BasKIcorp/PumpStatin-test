/**
 * Option C: flatten page.frames[stepId].blocks into page.blocks with props.stepId.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const profilesDir = path.join(root, "config", "profiles");

function flattenWizardPage(page) {
  if (page.type !== "wizard" || !page.frames) return page;
  const base = [...(page.blocks ?? [])];
  for (const [stepId, frame] of Object.entries(page.frames)) {
    for (const block of frame.blocks ?? []) {
      base.push({
        ...block,
        props: {
          ...(block.props ?? {}),
          stepId: block.props?.stepId ?? stepId,
        },
      });
    }
  }
  const { frames: _frames, ...rest } = page;
  return { ...rest, blocks: base };
}

function migrateSiteYaml(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const doc = YAML.parse(raw);
  if (!doc?.pages) return { changed: false, blockCount: 0 };
  let changed = false;
  let blockCount = 0;
  doc.pages = doc.pages.map((page) => {
    if (page.type !== "wizard" || !page.frames) return page;
    const next = flattenWizardPage(page);
    changed = true;
    blockCount = (next.blocks ?? []).length;
    return next;
  });
  if (changed) {
    fs.writeFileSync(filePath, YAML.stringify(doc, { lineWidth: 0 }), "utf8");
  }
  return { changed, blockCount };
}

const profileIds = fs
  .readdirSync(profilesDir)
  .filter((d) => fs.statSync(path.join(profilesDir, d)).isDirectory());

for (const profileId of profileIds) {
  const sitePath = path.join(profilesDir, profileId, "site.yaml");
  if (!fs.existsSync(sitePath)) {
    console.log(`${profileId}: skip (no site.yaml)`);
    continue;
  }
  const { changed, blockCount } = migrateSiteYaml(sitePath);
  console.log(
    changed
      ? `${profileId}: migrated → ${blockCount} blocks`
      : `${profileId}: already unified or no frames`,
  );
}
