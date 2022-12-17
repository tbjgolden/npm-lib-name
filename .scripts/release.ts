import { execSync, exec } from "node:child_process";
import { dnsLookup, isFile, readFile } from "easier-node";
import { firstIsBefore, parseVersion, Version } from "./lib/version";
import { getPackageRoot, getPackageJson } from "./lib/package";

if (process.cwd() !== (await getPackageRoot())) {
  console.log("plz run from package root");
  process.exit(1);
}

/*
- [x] check up to date with git
- [ ] perform custom validate checks
- ...
- [ ] final manual sanity checks
- [x] calculate next version
  - ...
- [ ] publish step
  - reverse engineer np
*/

console.log("checking if up to date...");
{
  execSync("git fetch --all --prune");
  const statusStdout = execSync("git --no-optional-locks status --porcelain=2 --branch").toString();
  const hasPendingFiles = statusStdout
    .split("\n")
    .some((line) => Boolean(line) && !line.startsWith("# "));
  if (hasPendingFiles) {
    console.log("local has uncommitted files");
    process.exit(1);
  }
  const isUpToDateWithRemote = statusStdout.includes("\n# branch.ab +0 -0");
  if (!isUpToDateWithRemote) {
    console.log("local is not level with remote");
    process.exit(1);
  }
}

console.log("");
console.log("validating package.json...");
console.log("");
const packageJson = await getPackageJson();

const hasNonDevDependencies =
  Object.keys(packageJson.dependencies ?? {}).length > 0 ||
  Object.keys(packageJson.peerDependencies ?? {}).length > 0 ||
  Object.keys(packageJson.optionalDependencies ?? {}).length > 0;
const hasDevDependencies = Object.keys(packageJson.devDependencies ?? {}).length > 0;
const hasSpecifiedEngineNode = Boolean(packageJson.engines?.node);
const hasSpecifiedFiles = packageJson.files !== undefined;
const hasTestScript =
  packageJson?.scripts?.test !== undefined &&
  !packageJson.scripts.test.includes("no test specified");
const hasEnoughKeywords = packageJson.keywords !== undefined && packageJson.keywords.length >= 8;
const hasAUsefulReadme = (await isFile("README.md")) && (await readFile("README.md")).length >= 800;

const errors: string[] = [];
const warnings: string[] = [];

if (!hasSpecifiedEngineNode) {
  errors.push(`package.json should specify the node version it is compatible with`);
}
if (!hasSpecifiedFiles) {
  errors.push(`package.json should include a files array`);
}
if (!hasTestScript) {
  errors.push(`package.json should include a test script`);
}
if (!hasEnoughKeywords) {
  errors.push(`package.json should have at least 8 keywords`);
}
if (!hasAUsefulReadme) {
  errors.push(`package.json should have a README.md (with 800+ chars)`);
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

if (!hasDevDependencies) {
  warnings.push(`package.json should probably have dev dependencies`);
}
if (!hasNonDevDependencies) {
  warnings.push(`package.json should probably have dependencies`);
}

// - has example usage
// - ensures it is up to date with remote

// - checks the running node and npm versions match engines
// - reinstalls dependencies to ensure your project passes tests with the latest dep tree
// - if has remote github url, opens a prefilled GitHub Releases draft after publish

if (errors.length > 0) {
  console.log(`ERRORS:\n${errors.map((message) => `- ${message}`).join("\n")}`);
}
if (warnings.length > 0) {
  console.log(`WARNINGS:\n${warnings.map((message) => `- ${message}`).join("\n")}`);
}
if (errors.length > 0) {
  process.exit(1);
}

// Use semantic release to generate sensible version
console.log("");
console.log("getting prev version...");
console.log("");
let currVersion: Version;
{
  let currVersionStr: string;
  try {
    currVersionStr = execSync(`npm show 'npm-lib-name' version`, {
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();
    console.log(currVersionStr);
  } catch {
    // this dns lookup checks if they have internet
    if (await dnsLookup("https://example.com")) {
      currVersionStr = "0.0.0-new";
      console.log("package does not yet exist");
    } else {
      console.log("error determining latest version of npm-lib-name on npm registry");
      process.exit(1);
    }
  }
  currVersion = parseVersion(currVersionStr);
}

type Commit = { hash: string; message: string; footer: string };

console.log("");
console.log("calculating next version...");
console.log("");
let nextVersion: string;
{
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
  console.log(nextVersion);
}

// suggest untestable final sanity checklist
// - readme updates?
// - would anything be better as a peer dep?
// - are the readme examples for cli/api also unit tests?

// cli: simulate a npm package locally, run with npx and check if results are right
// api: simulate a npm package locally and if ts-types work

// run npm release

// format:"%H{%s}"
