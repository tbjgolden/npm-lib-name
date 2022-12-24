import { unlink, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { fork } from "node:child_process";
import { readJSON } from "easier-node";
import { checkDirectory } from "./lib/utils.js";

type TSConfig = {
  compilerOptions: { [args: string]: unknown };
  exclude?: string[];
  [args: string]: unknown;
};

const tsc = async () => {
  const tsconfigJson = readJSON<TSConfig>(await readFile("tsconfig.json", "utf8"));
  const buildTsconfig: TSConfig = {
    ...tsconfigJson,
    exclude: [...(tsconfigJson.exclude ?? []), "**/*.test.ts"],
    compilerOptions: { ...tsconfigJson.compilerOptions, noEmit: false },
  };
  await writeFile("tsconfig.tmp.json", JSON.stringify(buildTsconfig));
  return new Promise<void>((resolve, reject) => {
    const child = fork("npx", ["tsc", "--project", "tsconfig.tmp.json"]);
    child.on("exit", async (code) => {
      await unlink("tsconfig.tmp.json");
      if (code) reject(new Error(`Error code: ${code}`));
      else resolve();
    });
  });
};

checkDirectory();

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await tsc();
