const fs = require("fs-extra");
const path = require("path");
const { execSync } = require("child_process");
const { glob } = require("glob-gitignore");
const readline = require("readline");
const validate = require("validate-npm-package-name");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const escapeRegExp = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
};

const read = (str) => {
  return new Promise((resolve) => {
    rl.question(`${str.trim()} `, (answer) => {
      resolve(answer);
    });
  });
};

const rename = async (rootDir) => {
  let result;
  do {
    result = (await read(`npm package name?`)).trim();
  } while (!validate(result).validForNewPackages || result.includes("/"));

  const files = (
    await glob(["**"], {
      cwd: rootDir,
      ignore: fs.readFileSync(path.join(__dirname, "../.gitignore"), "utf8"),
    })
  ).filter((p) => fs.statSync(p).isFile());

  const re = new RegExp(escapeRegExp("npm-lib-name"), "g");
  for (const filePath of files) {
    fs.writeFileSync(
      filePath,
      fs.readFileSync(filePath, "utf8").replace(re, result)
    );
  }
  fs.removeSync(path.join(__dirname, "../.scripts/init.js"));

  try {
    fs.removeSync(path.join(__dirname, "../.git"));
    execSync(
      "git init && git add . && git commit -m 'Initial commit from just-build'",
      {
        cwd: path.join(__dirname, ".."),
      }
    );
    console.log("New git repo created");
    execSync("npx husky install", {
      cwd: path.join(__dirname, ".."),
    });
    console.log("Husky git hooks installed");
  } catch (err) {}
};

rename(path.join(__dirname, ".."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .then(() => {
    rl.close();
  });
