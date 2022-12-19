```sh
git clone https://github.com/tbjgolden/npm-lib-name.git cool-package-name
cd cool-package-name
npm install
# One time init function to convert template to new project
npx xnr .scripts/name.ts
```

---

# npm-lib-name

![banner](banner.svg)

![npm](https://img.shields.io/npm/v/npm-lib-name)
![install size](https://img.shields.io/bundlephobia/min/npm-lib-name)
![coverage](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Ftbjgolden%2Fnpm-lib-name%2Fmain%2Fcoverage.json&label=coverage&query=$.total.lines.pct&color=brightgreen&suffix=%25)
![npm type definitions](https://img.shields.io/npm/types/xnr)
![license](https://img.shields.io/npm/l/xnr)

A npm library that does exactly what it says on the tin.

## Table of Contents

## Background

- Cover motivation.
- Cover abstract dependencies.
- Cover compatible versions of Node, npm and ECMAScript.
- Cover similar packages and alternatives.

## Install

This package is available from the `npm` registry.

```sh
npm install npm-lib-name
```

## Usage

```sh
npx npm-lib-name ...
```

Supports JavaScript + TypeScript:

```ts
import { foo } from "npm-lib-name";

foo();
```

Can also be imported via `require("npm-lib-name")`.

## API

...

## Credits

...

## Contributing

- State where users can ask questions.
- State whether PRs are accepted.
- List any requirements for contributing; for instance, having a sign-off on commits.

Dev environment requires:

- node >= 16.14.0
- npm >= 6.8.0
- git >= 2.11

## Licence

Apache-2.0
