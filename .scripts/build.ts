import fs from "node:fs/promises";
import { fork } from "node:child_process";
import { build } from "xnr";
import {
  readJSON,
  ensureEmptyFolderExists,
  copyFolderContentsToFolder,
  deleteFolder,
  isFile,
  readFile,
  writeFile,
} from "easier-node";
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

  const tsc = async (config: TSConfig) => {
    tsConfig.compilerOptions.noEmit = false;

    await writeFile("tsconfig.tmp.json", JSON.stringify(config));

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

  ensureEmptyFolderExists("dist");

  if (SHOULD_BUILD_CLI) {
    const entryPoint = await build("./cli/index.ts", ".xnrb");
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
      },
      include: ["lib/**/*"],
      exclude: ["**/*.test.ts"],
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
      exclude: ["**/*.test.ts"],
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
