#!/usr/bin/env node
// Package an inert design export as a self-contained, encrypted HTML page.
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const [sourceArgument, outputName] = process.argv.slice(2);
if (!sourceArgument || !outputName || !/^[a-z0-9][a-z0-9-]*\.html$/.test(outputName)) {
  throw new Error("Usage: node build-design-page.mjs /path/to/Main.dc.html page-name.html");
}
if (!process.env.STATICRYPT_PASSWORD) {
  throw new Error("Set STATICRYPT_PASSWORD in the environment before building.");
}
if (process.env.STATICRYPT_PASSWORD[0] !== process.env.STATICRYPT_PASSWORD[0].toLowerCase()) {
  throw new Error("Use a lowercase first letter in the build password; the entry form folds its first letter.");
}

const sourcePath = realpathSync(sourceArgument);
const source = readFileSync(sourcePath, "utf8");
const title = source.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
const component = source.match(/<x-dc>([\s\S]*?)<\/x-dc>/i)?.[1];
const propsJson = source.match(/data-props='([^']+)'/)?.[1];
if (!title || !component || !propsJson) {
  throw new Error("Expected a design export with a title, x-dc template, and default properties.");
}

const props = JSON.parse(propsJson);
const helmet = component.match(/<helmet>([\s\S]*?)<\/helmet>/i)?.[1] ?? "";
let body = component.replace(/<helmet>[\s\S]*?<\/helmet>/i, "");
const resolveDefaults = (html) => html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name) => {
  const value = props[name]?.default;
  if (typeof value !== "string" || !/^#[a-fA-F0-9]{3,8}$/.test(value)) {
    throw new Error(`Expected a default color for ${name}.`);
  }
  return value;
});
body = resolveDefaults(body);
if (/\{\{|<script\b|<x-dc\b/i.test(body + helmet)) {
  throw new Error("This packager supports static design templates only.");
}

const assetsDirectory = realpathSync(path.join(path.dirname(sourcePath), "assets"));
let embeddedImages = 0;
body = body.replace(/src="(\.\/assets\/[^"?#]+)"/g, (_, relativePath) => {
  const assetPath = realpathSync(path.resolve(path.dirname(sourcePath), relativePath));
  if (!assetPath.startsWith(assetsDirectory + path.sep)) {
    throw new Error("Image path must be inside the export's assets directory.");
  }
  const mimeTypes = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
  const mimeType = mimeTypes[path.extname(assetPath).toLowerCase()];
  if (!mimeType) throw new Error("Unsupported image format.");
  embeddedImages++;
  return `src="data:${mimeType};base64,${readFileSync(assetPath).toString("base64")}"`;
});
if (/src="(?!data:)/i.test(body)) {
  throw new Error("Every image must be embedded before encryption.");
}

const plaintext = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
${resolveDefaults(helmet)}
</head>
<body>${body}</body>
</html>
`;
const sourceDirectory = path.join(repoRoot, "src");
mkdirSync(sourceDirectory, { recursive: true });
const preparedPath = path.join(sourceDirectory, outputName);
writeFileSync(preparedPath, plaintext);

const result = spawnSync(process.execPath, [
  path.join(repoRoot, "node_modules/staticrypt/cli/index.js"),
  preparedPath, "-d", ".", "--short", "--remember", "false",
  "--template", "templates/design-password.html",
  "--template-title", "Protected Strata update",
], { cwd: repoRoot, env: process.env, stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`Packaged ${embeddedImages} images; encrypted output: ${outputName}`);
