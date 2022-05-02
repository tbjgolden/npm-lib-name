/* eslint-disable no-console */
import fs from "node:fs/promises";
import path from "node:path";
import { fork } from "node:child_process";
import { build } from "esbuild";
import { parse } from "./deps/jsonc";
import { rimraf } from "./deps/rimraf";

const projectRoot = process.cwd();

const SHOULD_BUILD_CLI = true;
const SHOULD_BUILD_LIB = true;

type TSConfig = {
  compilerOptions: {
    [args: string]: unknown;
  };
  [args: string]: unknown;
};

const tsc = async (config: TSConfig) => {
  await fs.writeFile(path.join(projectRoot, "tsconfig.tmp.json"), JSON.stringify(config));

  return new Promise<void>((resolve, reject) => {
    const child = fork("./node_modules/.bin/tsc", ["--project", "tsconfig.tmp.json"], {
      cwd: projectRoot,
    });
    child.on("exit", async (code) => {
      await fs.unlink(path.join(projectRoot, "tsconfig.tmp.json"));
      if (code) {
        reject(new Error(`Error code: ${code}`));
      } else {
        resolve();
      }
    });
  });
};

const generate = async (tsConfig: TSConfig) => {
  try {
    const stats = await fs.stat(path.join(projectRoot, ".git"));
    if (!stats.isDirectory()) {
      throw new Error(".git not a directory");
    }
  } catch {
    throw new Error("Must be run from project root");
  }

  await rimraf(path.join(projectRoot, "dist"));

  if (SHOULD_BUILD_CLI) {
    await build({
      entryPoints: ["./cli/index.ts"],
      minify: true,
      bundle: true,
      outfile: "./dist/npm-lib-name",
      platform: "node",
      target: "es2017",
      logLevel: "info",
    });
  }

  if (SHOULD_BUILD_LIB) {
    await tsc({
      ...tsConfig,
      compilerOptions: {
        ...tsConfig.compilerOptions,
        outDir: "dist/cjs",
      },
      include: ["lib/**/*"],
    });

    await tsc({
      ...tsConfig,
      compilerOptions: {
        ...tsConfig.compilerOptions,
        outDir: "dist/esm",
        module: "ES2020",
        moduleResolution: "node",
      },
      include: ["lib/**/*"],
    });
  }
};

const main = async () => {
  const fileContent = await fs.readFile(path.join(projectRoot, "tsconfig.json"), "utf8");
  generate(parse<TSConfig>(fileContent));
};

main().catch((error) => {
  throw error;
});
