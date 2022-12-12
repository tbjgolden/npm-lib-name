/* eslint-disable no-console */
import fs from "node:fs/promises";
import path from "node:path";
import { fork } from "node:child_process";
import { build } from "xnr";
import { getPackageRoot } from "./deps/package";
import {
  readJSON,
  ensureEmptyFolderExists,
  copyFolderContentsToFolder,
  deleteFolder,
} from "easier-node";

const SHOULD_BUILD_CLI = true;
const SHOULD_BUILD_LIB = true;

type TSConfig = {
  compilerOptions: {
    [args: string]: unknown;
  };
  [args: string]: unknown;
};

const main = async () => {
  const projectRoot = await getPackageRoot();
  const fileContent = await fs.readFile(path.join(projectRoot, "tsconfig.json"), "utf8");
  const tsConfig = readJSON<TSConfig>(fileContent);

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

  ensureEmptyFolderExists(path.join(projectRoot, "dist"));

  if (SHOULD_BUILD_CLI) {
    await build("./cli/index.ts");
  }

  if (SHOULD_BUILD_LIB) {
    await tsc({
      ...tsConfig,
      compilerOptions: {
        ...tsConfig.compilerOptions,
        outDir: "dist/cjs",
        noEmit: false,
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
        noEmit: false,
      },
      include: ["lib/**/*"],
    });
  }

  if (SHOULD_BUILD_CLI) {
    await copyFolderContentsToFolder(".xnrb", "dist");
    await deleteFolder(".xnrb");
  }
};

main().catch((error) => {
  throw error;
});
