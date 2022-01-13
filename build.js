const { build } = require("esbuild");
const { fork } = require("child_process");
const fs = require("fs-extra");
const path = require("path");
const JSON5 = require("json5");
const { paths } = require("node-dir");

const SHOULD_TARGET_BROWSER = true;
const SHOULD_TARGET_NODE = true;
const SHOULD_TARGET_ESM = true;

const SHOULD_BUILD_CLI = true; // <- ignores target flags
const SHOULD_BUILD_LIB = true;
const SHOULD_BUILD_SERVER = false;

const tsConfig = JSON5.parse(
  fs.readFileSync(path.join(__dirname, "tsconfig.json"), "utf8")
);

const fixPaths = (rootDir) => {
  return new Promise((resolve, reject) => {
    paths(rootDir, (err, paths) => {
      if (err) return reject(err);
      for (const filePath of paths.files) {
        const dirname = path.join(filePath, "..");
        const relPath = path.relative(dirname, rootDir);
        fs.writeFileSync(
          filePath,
          fs
            .readFileSync(filePath, "utf8")
            .replace(/(["'])npm-lib-name\//g, `$1${relPath}/`)
        );
      }
      resolve();
    });
  });
};

const tsc = (config = tsConfig) => {
  fs.writeFileSync(
    path.join(__dirname, "tsconfig.tmp.json"),
    JSON.stringify(config)
  );
  return new Promise((resolve, reject) => {
    const child = fork(
      "./node_modules/.bin/tsc",
      ["--project", "tsconfig.tmp.json"],
      { cwd: __dirname }
    );
    child.on("exit", (code) => {
      fs.removeSync(path.join(__dirname, "tsconfig.tmp.json"));
      if (code) {
        reject(new Error(`Error code: ${code}`));
      } else {
        resolve();
      }
    });
  });
};

const generate = async () => {
  if (SHOULD_BUILD_CLI) {
    await build({
      entryPoints: ["./_cli/index.cjs"],
      minify: true,
      bundle: true,
      outfile: "./cli.cjs",
      platform: "node",
      target: "es2017", // Node 10 LTS
      logLevel: "info",
    });
  }

  if (SHOULD_BUILD_LIB) {
    if (SHOULD_TARGET_NODE) {
      fs.removeSync(path.join(__dirname, "cjs"));
      await tsc({
        ...tsConfig,
        compilerOptions: {
          ...tsConfig.compilerOptions,
          outDir: "cjs",
        },
        include: ["_core/**/*", "_react/**/*"],
      });
      fs.moveSync(
        path.join(__dirname, "cjs", "_core"),
        path.join(__dirname, "cjs", "core")
      );
      fs.moveSync(
        path.join(__dirname, "cjs", "_react"),
        path.join(__dirname, "cjs", "react")
      );
      fixPaths(path.join(__dirname, "cjs"));
    }
    if (SHOULD_TARGET_ESM) {
      fs.removeSync(path.join(__dirname, "esm"));
      await tsc({
        ...tsConfig,
        compilerOptions: {
          ...tsConfig.compilerOptions,
          outDir: "esm",
          module: "ES2020",
          moduleResolution: "node",
        },
        include: ["_core/**/*", "_react/**/*"],
      });
      fs.moveSync(
        path.join(__dirname, "esm", "_core"),
        path.join(__dirname, "esm", "core")
      );
      fs.moveSync(
        path.join(__dirname, "esm", "_react"),
        path.join(__dirname, "esm", "react")
      );
      fixPaths(path.join(__dirname, "esm"));
    }
    if (SHOULD_TARGET_BROWSER) {
      fs.removeSync(path.join(__dirname, "browser"));
      await build({
        entryPoints: ["./_core/index.ts", "./_react/index.tsx"],
        minify: true,
        bundle: true,
        outdir: "./browser",
        platform: "browser",
        sourcemap: true,
        target: "es2017", // >93% support
        logLevel: "info",
        globalName: "NPMLibName",
      });
      fs.moveSync(
        path.join(__dirname, "browser", "_core"),
        path.join(__dirname, "browser", "core")
      );
      fs.moveSync(
        path.join(__dirname, "browser", "_react"),
        path.join(__dirname, "browser", "react")
      );
      // node-browser-builtins
    }
  }
};

generate().catch((error) => {
  console.error(error);
  process.exit(1);
});
