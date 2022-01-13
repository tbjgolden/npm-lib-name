#!/usr/bin/env node

const { hello } = require("npm-lib-name/core");

const [_cmd, _fileName, ...args] = process.argv;
const arg = args.join(" ");

if (arg !== "") {
  console.log(hello(arg));
}
