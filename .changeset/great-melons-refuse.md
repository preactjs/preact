---
'preact': major
---

- `[MAJOR]` Deprecated `component.base`
- `[MAJOR]` Remove `replaceNode`, [use this technique instead](https://gist.github.com/developit/f321a9ef092ad39f54f8d7c8f99eb29a)
- `[MAJOR]` Removed select `<option>` fix for IE11, using select in IE11 will always require you to specify a `value` attribute
- `[MAJOR]` Removed automatic suffixing of `px` to dimensional style attributes
- `[MAJOR]` Forward ref by default on functional components (this is not the case for compat)
- `[MINOR]` Add truely controlled components
- `[MINOR]` Add `createRoot` API
- `[MAJOR]` Change `options._hook` to get an internal passed in (devtools)
