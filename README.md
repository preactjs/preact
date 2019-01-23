# ceviche (a.k.a "Preact X")

A smaller, faster, more React-compatible and feature-rich version of Preact.

## Hacking on the code

**Installation:**

```sh
git clone git@github.com:developit/ceviche.git
cd ceviche
npm i
# install demo dependencies
cd demo && npm i && cd ..
```

**Useful scripts to run:**

```sh
# create a production build in dist/
npm run build

# rebuild on any change (useful for demo hacking)
npm run dev

# run all tests once (and legacy benchmarks)
npm t

# run main tests in watch mode
npm run test:karma:watch

# run legacy benchmarks in watch mode
npm run test:karma:bench

# run benchmarks (new version)
npm run benchmark
```

## The Demo

There's a collection of demos in `demo/`, bundled via a pretty standard Webpack setup.

The demo uses `preact-router`, which hasn't yet been updated to account for Ceviche's new VNode format,
so we "polyfill" Preact 8.x's VNode format in `demo/preact.js`. This polyfill should form the basis
of the 8.x compatibility shim we ship at launch.

**To run the demos:**

```sh
# start live demo server
cd demo && npm start
```

#### DOM Mutation Logging

The demo is also instrumented to allow logging all DOM manipulation.
This can be enabled for a single page load by adding `?logger=true` to the URL, or permanently by setting `localStorage.LOG=true` in your console.
When working with some of the more tricky implementation details like Fragments or hydration, it's often useful familiarize yourself with the number of DOM operations performed when reloading and interacting each of the demos.
This way, leaving logging turned on will alert you to any possible diffing and performance implications of your changes.
