const fs = require("fs"),
  path = require("path"),
  crypto = require("crypto"),
  assert = require("assert/strict");
const yaml = require("js-yaml");
const output = process.argv[2] || "dist";
const manifest = yaml.load(
  fs.readFileSync(path.join(output, require('../package.json').version.includes('-beta.')?'beta.yml':'latest.yml'), "utf8"),
);
const version = require("../package.json").version;
assert.equal(
  manifest.version,
  version,
  "Update metadata must match this release",
);
assert.ok(manifest.files?.length, "Update metadata must contain the installer");
for (const entry of manifest.files) {
  assert.equal(
    entry.url,
    `Nook-Setup-${version}-x64.exe`,
    "Unexpected update asset",
  );
  const file = fs.readFileSync(path.join(output, entry.url));
  assert.equal(file.length, entry.size, "Installer size mismatch");
  assert.equal(
    crypto.createHash("sha512").update(file).digest("base64"),
    entry.sha512,
    "Installer checksum mismatch",
  );
  assert.ok(
    fs.existsSync(path.join(output, entry.url + ".blockmap")),
    "Differential update file missing",
  );
}
console.log(
  "Installer, update metadata, SHA-512 checksum, and block map verified.",
);
