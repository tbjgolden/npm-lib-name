# Use case

**OSS lib development**

- npm package
  - supports node-browser shared env out of box
- cli
  - boilerplate to wire a cli to a lib

This is not a [node app starter](https://github.com/mrwade/ultimate-node-stack), a [web app starter](https://github.com/withastro/astro), or a [hybrid starter](https://github.com/vercel/next.js/).

# Init

```sh
# The usual
git clone https://github.com/tbjgolden/just-build.git <dir>
cd <dir>
npm install
# One time init function to convert template to new project
npx esr .scripts/init.ts
```

# Key data

Dev environment requires:

- node 10+
- npm >= 5.2.0

Output code is ES6 and targets:

- node 10+
- All major non-dead browsers (>93%)

<!--
Make this better checklist:

- [ ] improve the eslint config
- [ ] borrow good stuff from hackathon-starter
  - [ ] create help script
- [1/2] remove old dependencies (fs-extra)
- [x] config js => mjs, cjs only
- [x] scripts to ts only
- [x] remove web
-->
