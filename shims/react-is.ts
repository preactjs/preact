//for discussion
//export {isValidElement as isValidElementType} from 'preact/compat'

//redux uses import { isValidElementType, isContextConsumer } from 'react-is'
//material ui uses a couple too
//https://github.com/reduxjs/react-redux/blob/master/src/components/connectAdvanced.js

//kind of related
//caution though, i think some libs will start to rely on changedBits, which is on the react consumer interface, which in-tern relies on react-is, just letting that brew for now see https://github.com/dai-shi/react-tracked/blob/master/src/createProvider.js for an example



'use strict';
const hasSymbol = typeof Symbol === 'function' && Symbol.for;
export const REACT_ELEMENT_TYPE = hasSymbol
  ? Symbol.for('react.element')
  : 0xeac7;
export const REACT_PORTAL_TYPE = hasSymbol
  ? Symbol.for('react.portal')
  : 0xeaca;
export const REACT_FRAGMENT_TYPE = hasSymbol
  ? Symbol.for('react.fragment')
  : 0xeacb;
export const REACT_STRICT_MODE_TYPE = hasSymbol
  ? Symbol.for('react.strict_mode')
  : 0xeacc;
export const REACT_PROFILER_TYPE = hasSymbol
  ? Symbol.for('react.profiler')
  : 0xead2;
export const REACT_PROVIDER_TYPE = hasSymbol
  ? Symbol.for('react.provider')
  : 0xeacd;
export const REACT_CONTEXT_TYPE = hasSymbol
  ? Symbol.for('react.context')
  : 0xeace;
// TODO: We don't use AsyncMode or ConcurrentMode anymore. They were temporary
// (unstable) APIs that have been removed. Can we remove the symbols?
export const REACT_ASYNC_MODE_TYPE = hasSymbol
  ? Symbol.for('react.async_mode')
  : 0xeacf;
export const REACT_CONCURRENT_MODE_TYPE = hasSymbol
  ? Symbol.for('react.concurrent_mode')
  : 0xeacf;
export const REACT_FORWARD_REF_TYPE = hasSymbol
  ? Symbol.for('react.forward_ref')
  : 0xead0;
export const REACT_SUSPENSE_TYPE = hasSymbol
  ? Symbol.for('react.suspense')
  : 0xead1;
export const REACT_SUSPENSE_LIST_TYPE = hasSymbol
  ? Symbol.for('react.suspense_list')
  : 0xead8;
export const REACT_MEMO_TYPE = hasSymbol ? Symbol.for('react.memo') : 0xead3;
export const REACT_LAZY_TYPE = hasSymbol ? Symbol.for('react.lazy') : 0xead4;
export const REACT_FUNDAMENTAL_TYPE = hasSymbol
  ? Symbol.for('react.fundamental')
  : 0xead5;
export const REACT_RESPONDER_TYPE = hasSymbol
  ? Symbol.for('react.responder')
  : 0xead6;
export const REACT_SCOPE_TYPE = hasSymbol ? Symbol.for('react.scope') : 0xead7;
const MAYBE_ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
const FAUX_ITERATOR_SYMBOL = '@@iterator';
export function getIteratorFn(maybeIterable?: any): () => Iterator<any> | null {
  if (maybeIterable === null || typeof maybeIterable !== 'object') {
    return null;
  }
  const maybeIterator =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable[FAUX_ITERATOR_SYMBOL];
  if (typeof maybeIterator === 'function') {
    return maybeIterator;
  }
  return null;
}
export function isValidElementType(type: any) {
  return (
    typeof type === 'string' ||
    typeof type === 'function' ||
    // Note: its typeof might be other than 'symbol' or 'number' if it's a polyfill.
    type === REACT_FRAGMENT_TYPE ||
    type === REACT_CONCURRENT_MODE_TYPE ||
    type === REACT_PROFILER_TYPE ||
    type === REACT_STRICT_MODE_TYPE ||
    type === REACT_SUSPENSE_TYPE ||
    type === REACT_SUSPENSE_LIST_TYPE ||
    (typeof type === 'object' && type !== null &&
      (type.$$typeof === REACT_LAZY_TYPE ||
        type.$$typeof === REACT_MEMO_TYPE ||
        type.$$typeof === REACT_PROVIDER_TYPE ||
        type.$$typeof === REACT_CONTEXT_TYPE ||
        type.$$typeof === REACT_FORWARD_REF_TYPE ||
        type.$$typeof === REACT_FUNDAMENTAL_TYPE ||
        type.$$typeof === REACT_RESPONDER_TYPE ||
        type.$$typeof === REACT_SCOPE_TYPE))
  );
}
let lowPriorityWarningWithoutStack = function() {};
// if (__DEV__) {
//   const printWarning = function(format, ...args) {
//     let argIndex = 0;
//     const message = 'Warning: ' + format.replace(/%s/g, () => args[argIndex++]);
//     if (typeof console !== 'undefined') {
//       console.warn(message);
//     }
//     try {
//       // --- Welcome to debugging React ---
//       // This error was thrown as a convenience so that you can use this stack
//       // to find the callsite that caused this warning to fire.
//       throw new Error(message);
//     } catch (x) {}
//   };
//   lowPriorityWarningWithoutStack = function(condition, format, ...args) {
//     if (format === undefined) {
//       throw new Error(
//         '`lowPriorityWarningWithoutStack(condition, format, ...args)` requires a warning ' +
//           'message argument',
//       );
//     }
//     if (!condition) {
//       printWarning(format, ...args);
//     }
//   };
// }
export function typeOf(object: any) {
  if (typeof object === 'object' && object !== null) {
    const $$typeof = object.$$typeof;
    switch ($$typeof) {
      case REACT_ELEMENT_TYPE:
        const type = object.type;
        switch (type) {
          case REACT_ASYNC_MODE_TYPE:
          case REACT_CONCURRENT_MODE_TYPE:
          case REACT_FRAGMENT_TYPE:
          case REACT_PROFILER_TYPE:
          case REACT_STRICT_MODE_TYPE:
          case REACT_SUSPENSE_TYPE:
            return type;
          default:
            const $$typeofType = type && type.$$typeof;
            switch ($$typeofType) {
              case REACT_CONTEXT_TYPE:
              case REACT_FORWARD_REF_TYPE:
              case REACT_PROVIDER_TYPE:
                return $$typeofType;
              default:
                return $$typeof;
            }
        }
      case REACT_LAZY_TYPE:
      case REACT_MEMO_TYPE:
      case REACT_PORTAL_TYPE:
        return $$typeof;
    }
  }
  return undefined;
}
//these export names are dumb - should be changed
// AsyncMode is deprecated along with isAsyncMode
export const AsyncMode = REACT_ASYNC_MODE_TYPE;
export const ConcurrentMode = REACT_CONCURRENT_MODE_TYPE;
export const ContextConsumer = REACT_CONTEXT_TYPE;
export const ContextProvider = REACT_PROVIDER_TYPE;
export const Element = REACT_ELEMENT_TYPE;
export const ForwardRef = REACT_FORWARD_REF_TYPE;
export const Fragment = REACT_FRAGMENT_TYPE;
export const Lazy = REACT_LAZY_TYPE;
export const Memo = REACT_MEMO_TYPE;
export const Portal = REACT_PORTAL_TYPE;
export const Profiler = REACT_PROFILER_TYPE;
export const StrictMode = REACT_STRICT_MODE_TYPE;
export const Suspense = REACT_SUSPENSE_TYPE;
let hasWarnedAboutDeprecatedIsAsyncMode = false;
// AsyncMode should be deprecated
export function isAsyncMode(object: any) {
  // if (__DEV__) {
  //   if (!hasWarnedAboutDeprecatedIsAsyncMode) {
  //     hasWarnedAboutDeprecatedIsAsyncMode = true;
  //     lowPriorityWarningWithoutStack(
  //       false,
  //       'The ReactIs.isAsyncMode() alias has been deprecated, ' +
  //         'and will be removed in React 17+. Update your code to use ' +
  //         'ReactIs.isConcurrentMode() instead. It has the exact same API.',
  //     );
  //   }
  // }
  return isConcurrentMode(object) || typeOf(object) === REACT_ASYNC_MODE_TYPE;
}
export function isConcurrentMode(object: any) {
  return typeOf(object) === REACT_CONCURRENT_MODE_TYPE;
}
export function isContextConsumer(object: any) {
  return typeOf(object) === REACT_CONTEXT_TYPE;
}
export function isContextProvider(object: any) {
  return typeOf(object) === REACT_PROVIDER_TYPE;
}
export function isElement(object: any) {
  return (
    typeof object === 'object' &&
    object !== null &&
    object.$$typeof === REACT_ELEMENT_TYPE
  );
}
export function isForwardRef(object: any) {
  return typeOf(object) === REACT_FORWARD_REF_TYPE;
}
export function isFragment(object: any) {
  return typeOf(object) === REACT_FRAGMENT_TYPE;
}
export function isLazy(object: any) {
  return typeOf(object) === REACT_LAZY_TYPE;
}
export function isMemo(object: any) {
  return typeOf(object) === REACT_MEMO_TYPE;
}
export function isPortal(object: any) {
  return typeOf(object) === REACT_PORTAL_TYPE;
}
export function isProfiler(object: any) {
  return typeOf(object) === REACT_PROFILER_TYPE;
}
export function isStrictMode(object: any) {
  return typeOf(object) === REACT_STRICT_MODE_TYPE;
}
export function isSuspense(object: any) {
  return typeOf(object) === REACT_SUSPENSE_TYPE;
}