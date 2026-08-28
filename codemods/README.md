# Preact 10 to 11 codemod

This package includes a conservative source codemod for the mechanical parts of
the [Preact 11 upgrade guide](https://preactjs.com/guide/v11/upgrade-guide/).
Upgrade `preact` first, then resolve the transform included with the installed
package:

```sh
node -p "require.resolve('preact/codemods/10-to-11')"
```

Pass the printed path to [jscodeshift](https://github.com/facebook/jscodeshift).
Run it in dry mode first and replace `src` with the files or directories you
want to migrate:

```sh
npx jscodeshift@17.4.0 --dry --print \
  --transform /path/printed/above \
  --extensions=js,jsx,ts,tsx \
  src
```

Remove `--dry --print` to write the changes. The transform:

- moves native `createPortal` imports and re-exports from `preact/compat` to
  `preact`;
- removes inline `forwardRef` wrappers and reads `ref` from component props;
- adds the required `undefined` argument to zero-argument `useRef()` calls;
- preserves Preact 10's `px` suffix for dimensional numeric literals in inline
  JSX style objects;
- replaces three-argument `render(vnode, parent, replaceNode)` calls with
  `render(vnode, createRootFragment(parent, replaceNode))`;
- moves Preact types removed from the `JSX` namespace to direct type imports;
- replaces direct `preact/**/dist/*` module paths with public package entry
  points.

If the transform adds an import from `preact-root-fragment`, install that
package in the application as well:

```sh
npm install preact-root-fragment
```

The transform only changes bindings imported from Preact's native entry points.
It intentionally leaves `react`, `react-dom`, namespace imports, and shadowed
local functions alone. It also leaves non-inline or complex `forwardRef`
callbacks in place and reports them in jscodeshift's statistics.

## Manual checks

Some upgrade steps need application-specific decisions and are not safe to
rewrite automatically:

- Preact 11 requires TypeScript 5.1 and newer browser targets, and most bundles
  are ESM-only. Convert CommonJS or UMD consumers that cannot load ESM.
- Dynamic numeric style values may need an explicit unit; the transform only
  changes numeric literals.
- Replace core `defaultProps` with JavaScript default parameters where
  appropriate. `preact/compat` continues to support `defaultProps`.
- Review refs that previously depended on receiving a component instance.
- Replace `Component.base` access where it is still needed.
- Remove or redesign `SuspenseList` usage.
- Tests that expect synchronous `useEffect` cleanup may need to flush effects,
  or the effect may need to become a `useLayoutEffect` when synchronous cleanup
  is required.

Review and format the resulting diff, then run the application's typecheck and
test suite.
