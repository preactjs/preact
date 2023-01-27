# preact

## 11.0.0

### Major Changes

- [#3363](https://github.com/preactjs/preact/pull/3363) [`ea9b8da1`](https://github.com/preactjs/preact/commit/ea9b8da180b66490e99cfbc6b103d178436b31b8) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - - `[MAJOR]` Deprecated `component.base`
  - `[MAJOR]` Remove `replaceNode`, [use this technique instead](https://gist.github.com/developit/f321a9ef092ad39f54f8d7c8f99eb29a)
  - `[MAJOR]` Removed select `<option>` fix for IE11, using select in IE11 will always require you to specify a `value` attribute
  - `[MAJOR]` Removed automatic suffixing of `px` to dimensional style attributes
  - `[MINOR]` Add `createRoot` API
  - `[MAJOR]` Change `options._hook` to get an internal passed in (devtools)

* [#3366](https://github.com/preactjs/preact/pull/3366) [`5a6f0367`](https://github.com/preactjs/preact/commit/5a6f0367e8c8d77b3c87488ee5e67e52483dd19a) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Move `defaultProps` handling to preact/compat

### Minor Changes

- [#3408](https://github.com/preactjs/preact/pull/3408) [`436afec3`](https://github.com/preactjs/preact/commit/436afec3ab8993fecaaf326b89e1c1e2e9d51c01) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Move `createPortal` to the core package

* [#3480](https://github.com/preactjs/preact/pull/3480) [`3bb6f6ed`](https://github.com/preactjs/preact/commit/3bb6f6ed1dc189da0b30385a4d60c96070f513df) Thanks [@marvinhagemeister](https://github.com/marvinhagemeister)! - Add `preact/server` entry to the core package

- [#3484](https://github.com/preactjs/preact/pull/3484) [`64d0f823`](https://github.com/preactjs/preact/commit/64d0f823e21f7254e2fe8ff94dc53d8a9d1cadfc) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Remove memory leak warning from debug

* [#3598](https://github.com/preactjs/preact/pull/3598) [`c0273909`](https://github.com/preactjs/preact/commit/c027390949420de18dd91bca7b7b00a9b388e790) Thanks [@JoviDeCroock](https://github.com/JoviDeCroock)! - Add the React 18 hooks
