import { execSync, exec } from "node:child_process";
import { delay, dnsLookup, isFile, readFile, readInput, removeAny, writeFile } from "easier-node";
import { firstIsBefore, parseVersion } from "./lib/version";
import { getPackageRoot, getPackageJson } from "./lib/package";

/*
- [x] check up to date with git
- [x] perform custom validate checks
- [x] calculate next version
- [x] final manual sanity checks
- [ ] build
- [ ] validate build
  - [ ] tests
- [ ] publish step
  - reverse engineer np
*/

// preconditions
{
  if (process.cwd() !== (await getPackageRoot())) {
    console.log("must be run from package root");
    process.exit(1);
  }
  execSync("git fetch --all --prune");
  const statusStdout = execSync("git --no-optional-locks status --porcelain=2 --branch").toString();
  const isPointingAtRemoteMain = statusStdout.includes("\n# branch.upstream origin/main");
  if (!isPointingAtRemoteMain) {
    console.log("can only release from main (with origin/main as upstream)");
    // process.exit(1);
  }
  const hasPendingFiles = statusStdout
    .split("\n")
    .some((line) => Boolean(line) && !line.startsWith("# "));
  if (hasPendingFiles) {
    console.log("local has uncommitted files");
    // process.exit(1);
  }
  const isUpToDateWithRemote = statusStdout.includes("\n# branch.ab +0 -0");
  if (!isUpToDateWithRemote) {
    console.log("local is not level with remote");
    // process.exit(1);
  }
}

// custom validation
const errors: string[] = [];
const warnings: string[] = [];

const packageJson = await getPackageJson();

// validation errors
if (!packageJson.engines?.node) {
  errors.push(`package.json should specify the node version it is compatible with`);
}
if (packageJson.files === undefined) {
  errors.push(`package.json should include a files array`);
}
if (
  packageJson?.scripts?.test === undefined ||
  packageJson.scripts.test.includes("no test specified")
) {
  errors.push(`package.json should include a test script`);
}
if (packageJson.keywords === undefined || packageJson.keywords.length < 7) {
  errors.push(`package.json should have at least 7 keywords`);
}
if ((packageJson.description?.length ?? 0) < 10) {
  errors.push(`package.json should have a short description`);
}
if (packageJson.license === undefined) {
  errors.push(`package.json needs a licence`);
}
if (!(await isFile("README.md")) || (await readFile("README.md")).length < 800) {
  errors.push(`project should contain a README.md (with 800+ chars)`);
}
const npmVulnerabilites = await new Promise<string>((resolve) => {
  exec("npm audit", (err, stdout) => {
    resolve(err ? stdout.trim() : "");
  });
});
if (npmVulnerabilites) {
  errors.push(
    `npm dependencies contain vulnerabilities:\n${npmVulnerabilites
      .split("\n")
      .map((line) => `  │ ${line}`)
      .join("\n")}`
  );
}

// validation warnings
if (Object.keys(packageJson.devDependencies ?? {}).length === 0) {
  warnings.push(`package.json should probably have dev dependencies`);
}
if (
  !(
    Object.keys(packageJson.dependencies ?? {}).length > 0 ||
    Object.keys(packageJson.peerDependencies ?? {}).length > 0 ||
    Object.keys(packageJson.optionalDependencies ?? {}).length > 0
  )
) {
  warnings.push(`package.json should probably have dependencies`);
}

// - standardised readme format / that can be checked? e.g. has example usage, fixed titles

if (errors.length > 0) {
  console.log(`ERRORS:\n${errors.map((message) => `- ${message}`).join("\n")}`);
  console.log();
}
if (warnings.length > 0) {
  console.log(`WARNINGS:\n${warnings.map((message) => `- ${message}`).join("\n")}`);
  console.log();
}
if (errors.length > 0) {
  process.exit(1);
}

if (warnings.length > 0) {
  const answer = await readInput("Some warnings - continue anyway? [N/y]");
  if (answer.trim().toLowerCase() !== "y") {
    process.exit(1);
  }
  console.log();
}

// calculating next version using semantic release principles
let nextVersion: string;
{
  let currVersionStr: string;
  try {
    currVersionStr = execSync(`npm show 'npm-lib-name' version`, {
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();
  } catch {
    // this dns lookup checks if they have internet
    if (await dnsLookup("https://example.com")) {
      currVersionStr = "0.0.0-new";
    } else {
      console.log("error determining latest version of npm-lib-name on npm registry");
      process.exit(1);
    }
  }
  const currVersion = parseVersion(currVersionStr);

  type Commit = { hash: string; message: string; footer: string };

  // get all commits with hashes, messages and footers
  const rawGitLogStr = execSync(`git --no-pager log --format=format:'%H$%n%B'`).toString();
  const matches = [...rawGitLogStr.matchAll(/(?<=^|\n)[\da-f]{40}(?=\$\n)/g)];
  const commits: Commit[] = new Array(matches.length);
  let prevIndex = rawGitLogStr.length;
  for (let i = matches.length - 1; i >= 0; i--) {
    const currIndex = matches[i].index as number;
    const hash = rawGitLogStr.slice(currIndex, currIndex + 40);
    const body = rawGitLogStr.slice(currIndex + 42, prevIndex - 1);
    let firstNewlineIndex = body.indexOf("\n");
    if (firstNewlineIndex === -1) firstNewlineIndex = Number.POSITIVE_INFINITY;
    const message = body.slice(0, firstNewlineIndex).trim();
    const footer = body.slice(firstNewlineIndex + 1).trim();

    commits[i] = { hash, message, footer };
    prevIndex = currIndex;
  }

  let indexOfPrevVersion = 0;
  for (const commit of commits) {
    const pkgJsonStr = execSync(`git show ${commit.hash}:package.json`).toString();
    let pkgJson: Record<string, unknown> = {};
    try {
      pkgJson = JSON.parse(pkgJsonStr);
    } catch {}
    const versionStr = typeof pkgJson.version === "string" ? pkgJson.version : "0.0.0-new";
    const version = parseVersion(versionStr);
    if (firstIsBefore(version, currVersion)) {
      break;
    } else {
      indexOfPrevVersion++;
    }
  }

  const featRegex = /^feat(\([^)]+\))?:/;
  const thisVersionCommits = commits.slice(0, indexOfPrevVersion);

  if (thisVersionCommits.length === 0) {
    console.log("no new commits since newest version");
    process.exit(1);
  }

  if (
    currVersion.major >= 1 &&
    firstIsBefore(currVersion, { major: currVersion.major, minor: 0, patch: 0 })
  ) {
    nextVersion = `${currVersion.major}.0.0`;
  } else if (firstIsBefore(currVersion, { major: 0, minor: 1, patch: 0 })) {
    nextVersion = `${currVersion.major}.1.0`;
  } else if (thisVersionCommits.some(({ footer }) => footer.includes("BREAKING CHANGE: "))) {
    nextVersion = `${currVersion.major + 1}.0.0`;
  } else if (thisVersionCommits.some(({ message }) => featRegex.test(message))) {
    nextVersion = `${currVersion.major}.${currVersion.minor + 1}.0`;
  } else {
    nextVersion = `${currVersion.major}.${currVersion.minor}.${currVersion.patch + 1}`;
  }
}

// suggest untestable final sanity checklist
console.log(`Final checklist:`);
console.log(`
- do you need to update the readme?
- would anything be better as a peer dep?
- are the examples in the readme examples for cli/api also unit tests?
`);
for (let i = 5; i >= 1; i--) {
  process.stdout.write(i + "…");
  await delay(1000);
}
const answer = await readInput(`release ${nextVersion}? [N/y]`);
if (answer.trim().toLowerCase() !== "y") {
  process.exit(1);
}

// actually run the deploy
await writeFile(
  "package.json",
  JSON.stringify(
    {
      ...packageJson,
      version: nextVersion,
    },
    null,
    2
  )
);
await removeAny("node_modules");
execSync("npm install --engine-strict --ignore-scripts", { stdio: "inherit" });
execSync("npm run build", { stdio: "inherit" });
execSync("npm run check-build", { stdio: "inherit" });
execSync("npm run coverage", { stdio: "inherit" });

console.log("final release checks passed... releasing...");

/*
- [x] update package.json version
- [x] remove node_modules
- [x] npm install --engine-strict
- [x] npm run build
  - [ ] update build to attach licence attribution comment
- [x] npm run check-build
    - [x] cli simulate a npm package locally, run with npx and check if results are right
    - [ ] api simulate a npm package locally and if ts-types work
- [x] npm run coverage
- at this point, there's no place for the release to fail
- perform the final modifications (and ignore Ctrl-C / other kills)
  - git add .
  - git commit -m 'release'
  - git tag
  - git push commit
  - git push tag
  - npm publish
*/

// run npm release
