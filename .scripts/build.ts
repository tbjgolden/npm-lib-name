import fs from "node:fs/promises";
import { fork } from "node:child_process";
import {
  readJSON,
  ensureEmptyFolderExists,
  copyFolderContentsToFolder,
  deleteFolder,
  isFile,
  readFile,
  writeFile,
  listFilesWithinFolder,
  copyFile,
} from "easier-node";
import { join, dirname } from "node:path/posix";
import { build } from "xnr";
import { checkDirectory } from "./lib/checkDirectory";

const SHOULD_BUILD_CLI = await isFile("cli/index.ts");
const SHOULD_BUILD_LIB = await isFile("lib/index.ts");

type TSConfig = {
  compilerOptions: {
    [args: string]: unknown;
  };
  [args: string]: unknown;
};

const main = async () => {
  await checkDirectory();

  const fileContent = await readFile("tsconfig.json");
  const tsConfig = readJSON<TSConfig>(fileContent);

  ensureEmptyFolderExists("dist");

  if (SHOULD_BUILD_CLI) {
    const entryPoint = await build("./cli/index.ts", ".build.cli");
    if (entryPoint) {
      await fs.chmod(entryPoint, 0o755);
    }
  }

  if (SHOULD_BUILD_LIB) {
    await tsc({
      ...tsConfig,
      compilerOptions: {
        ...tsConfig.compilerOptions,
        outDir: "dist/cjs",
        module: "CommonJS",
      },
    });

    const esmEntrypoint = await build("./lib/index.ts", ".build.lib");
    if (
      esmEntrypoint === undefined ||
      dirname(esmEntrypoint) !== join(process.cwd(), ".build.lib")
    ) {
      console.log("build could not complete successfully:");
      console.log("is your lib dir trying to import something from outside?");
      console.log();
      console.log("files from attempted build in .build.lib");
      process.exit(1);
    }

    await ensureEmptyFolderExists("dist/esm");
    await copyFolderContentsToFolder(".build.lib", "dist/esm");
    await deleteFolder(".build.lib");

    for (const filePath of await listFilesWithinFolder("dist/cjs")) {
      if (filePath.endsWith(".d.ts") || filePath.endsWith(".map")) {
        await copyFile(`dist/cjs/${filePath}`, `dist/esm/${filePath}`);
      }
    }
  }

  if (SHOULD_BUILD_CLI) {
    await copyFolderContentsToFolder(".build.cli", "dist");
    await deleteFolder(".build.cli");
  }
};

const tsc = async (tsConfig: TSConfig) => {
  tsConfig.compilerOptions.noEmit = false;
  tsConfig.include = ["lib/**/*"];
  tsConfig.exclude = ["**/*.test.ts"];

  // console.log(JSON.stringify(tsConfig, null, 2));
  await writeFile("tsconfig.tmp.json", JSON.stringify(tsConfig));

  return new Promise<void>((resolve, reject) => {
    const child = fork("./node_modules/.bin/tsc", ["--project", "tsconfig.tmp.json"]);
    child.on("exit", async (code) => {
      await fs.unlink("tsconfig.tmp.json");
      if (code) {
        reject(new Error(`Error code: ${code}`));
      } else {
        resolve();
      }
    });
  });
};

main().catch((error) => {
  throw error;
});
