/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import readline from "node:readline";
import { stdin, stdout } from "node:process";
import { validate } from "./deps/npmName";
import { rimraf } from "./deps/rimraf";

const projectRoot = process.cwd();

const rl = readline.createInterface({
  input: stdin,
  output: stdout,
});

const escapeRegExp = (str: string): string => {
  return str.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&"); // $& means the whole matched string
};

const read = (str: string): Promise<string> => {
  return new Promise<string>((resolve) => {
    rl.question(`${str.trim()} `, (answer) => {
      resolve(answer);
    });
  });
};

const main = async () => {
  if (!fs.existsSync(path.join(projectRoot, ".git"))) {
    throw new Error("Must be run from project root");
  }

  let result;
  do {
    const stdin = await read(`npm package name?`);
    result = stdin.trim();
  } while (!validate(result).valid || result.includes("/"));

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
  await rimraf(path.join(projectRoot, ".scripts/init.ts"));

  try {
    await rimraf(path.join(projectRoot, ".git"));
    execSync("git init && git add . && git commit -m 'Initial commit from just-build'", {
      cwd: projectRoot,
    });
    console.log("New git repo created");
    execSync("npx husky install", {
      cwd: projectRoot,
    });
    console.log("Husky git hooks installed");
  } catch {
    //
  }
};

let mainError: Error | undefined;
main()
  .catch((error) => {
    mainError = error;
  })
  .then(() => {
    rl.close();
    if (mainError !== undefined) {
      throw mainError;
    }
  });
