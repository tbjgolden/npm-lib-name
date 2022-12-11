/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { validate } from "./deps/npmName";
import { getPackageRoot } from "./deps/package";
import { deleteFolder, readInput } from "easier-node";

const escapeRegExp = (str: string): string => {
  return str.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&"); // $& means the whole matched string
};

const currentName = "npm-lib-name";

const main = async () => {
  const projectRoot = await getPackageRoot();

  const directoryName = projectRoot.slice(path.dirname(projectRoot).length + 1);
  const initial: string | undefined = validate(directoryName).valid
    ? directoryName
    : undefined;
  let result: string | undefined;
  let validateResult: ReturnType<typeof validate> | undefined;

  do {
    if (validateResult !== undefined) {
      for (const error of validateResult.errors) {
        console.log("  - " + error);
      }
    }

    const input = await readInput(`npm package name? [${initial}]`);
    let value = input.trim();
    if (value === "" && initial) {
      value = initial;
    }

    result = value.trim();
    validateResult = validate(result);
  } while (!validateResult.valid || result.includes("/"));

  const stdout = execSync(
    `git status --short | grep '^?' | cut -d\\  -f2- && git ls-files`
  ).toString();

  const files = stdout.split("\n").filter((p: string) => {
    if (p === "") return false;
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });

  const re = new RegExp(escapeRegExp("npm-lib-name"), "g");
  for (const filePath of files) {
    fs.writeFileSync(filePath, fs.readFileSync(filePath, "utf8").replace(re, result));
  }

  try {
    // should only run on first name
    if (currentName === `npm${"-"}lib${"-"}name`) {
      await deleteFolder(path.join(projectRoot, ".git"));
      execSync(
        "git init && git add . && git commit -m 'Initial commit from just-build'",
        {
          cwd: projectRoot,
        }
      );
      console.log("New git repo created");
      execSync("npx simple-git-hooks", {
        cwd: projectRoot,
      });
      console.log("git hooks installed");
    }
  } catch {
    //
  }
};

main().catch((error) => {
  throw error;
});
