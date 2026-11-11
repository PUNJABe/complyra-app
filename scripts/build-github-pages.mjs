import { cp, copyFile, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!apiUrl) {
  throw new Error(
    "Set NEXT_PUBLIC_API_BASE_URL to the HTTPS origin of the separately hosted API.",
  );
}
const parsedApiUrl = new URL(apiUrl);
if (
  parsedApiUrl.protocol !== "https:" ||
  parsedApiUrl.pathname !== "/" ||
  parsedApiUrl.search ||
  parsedApiUrl.hash
) {
  throw new Error(
    "NEXT_PUBLIC_API_BASE_URL must be an HTTPS origin without a path, query, or fragment.",
  );
}

const temp = await mkdtemp(path.join(root, ".pages-export-"));
const stagedSource = path.join(temp, "src");

try {
  await cp(path.join(root, "src"), stagedSource, {
    recursive: true,
    filter: (source) =>
      source !== path.join(root, "src", "app", "api") &&
      source !== path.join(root, "src", "proxy.ts"),
  });
  for (const file of [
    "package.json",
    "next.config.ts",
    "next-env.d.ts",
    "postcss.config.mjs",
    "tsconfig.json",
  ]) {
    await copyFile(path.join(root, file), path.join(temp, file));
  }
  await cp(path.join(root, "public"), path.join(temp, "public"), {
    recursive: true,
  });

  const result = spawnSync(
    process.execPath,
    [path.join(root, "node_modules", "next", "dist", "bin", "next"), "build"],
    {
      cwd: temp,
      stdio: "inherit",
      env: {
        ...process.env,
        NEXT_STATIC_EXPORT: "true",
        NEXT_PUBLIC_STATIC_EXPORT: "true",
      },
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  } else {
    await rm(path.join(root, "out"), { recursive: true, force: true });
    await cp(path.join(temp, "out"), path.join(root, "out"), {
      recursive: true,
    });
    process.exitCode = 0;
  }
} finally {
  await rm(temp, { recursive: true, force: true });
}
