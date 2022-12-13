import { execSync } from "node:child_process";
import { dnsLookup } from "easier-node";

// Run build
console.log("building...");
execSync("npm run build", { stdio: "inherit" });

// Run test
console.log("testing...");
execSync("npm run coverage", { stdio: "inherit" });
console.log("");

// Use semantic release to generate sensible version
console.log("getting prev version...");
console.log("");
let currentVersion: string;
try {
  currentVersion = execSync(`npm show 'npm-lib-name' version`, {
    stdio: ["ignore", "pipe", "ignore"],
  }).toString();
  console.log(currentVersion);
} catch {
  // this dns lookup checks if they have internet
  if (await dnsLookup("https://example.com")) {
    currentVersion = "0.0.0-new";
    console.log("package does not yet exist");
  } else {
    console.log("error determining latest version of npm-lib-name on npm registry");
    process.exit(1);
  }
}

// if 0.0.0-new, obvs should be lel

// run sanity checks

// suggest untestable final sanity checklist (e.g. readme updates)

// run npm release
