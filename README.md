```sh
git clone https://github.com/tbjgolden/npm-lib-name.git cool-package-name
cd cool-package-name
npx find-repl npm-lib-name cool-package-name
rm -rf .git
git init
npm install
```

---

# npm-lib-name

![banner](banner.svg)

![npm](https://img.shields.io/npm/v/npm-lib-name)
![npm type definitions](https://img.shields.io/npm/types/npm-lib-name)
![license](https://img.shields.io/npm/l/npm-lib-name)
[![install size](https://packagephobia.com/badge?p=npm-lib-name)](https://packagephobia.com/result?p=npm-lib-name)

A npm library that does exactly what it says on the tin.

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
