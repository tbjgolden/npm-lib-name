const fs = require("fs-extra");
const path = require("path");
const { glob } = require("glob-gitignore");
const readline = require("readline");
const validate = require("validate-npm-package-name");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

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
  } while (!validate(result).validForNewPackages);

  const files = (
    await glob(["**"], {
      cwd: rootDir,
      ignore: fs.readFileSync(path.join(__dirname, "../.gitignore"), "utf8"),
    })
  ).filter((p) => fs.statSync(p).isFile());

  for (const filePath of files) {
    fs.writeFileSync(
      filePath,
      fs.readFileSync(filePath, "utf8") // .replace(/ /g, result)
    );
  }
};

rename(path.join(__dirname, ".."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .then(() => {
    rl.close();
  });
