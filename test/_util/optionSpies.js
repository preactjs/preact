import { options as rawOptions } from 'preact';
import { vi } from 'vitest';

/** @type {import('preact/src/internal').Options} */
let options = rawOptions;

let oldVNode = options.vnode;
let oldEvent = options.event || (e => e);
let oldAfterDiff = options.diffed;
let oldUnmount = options.unmount;

let oldRoot = options._root;
let oldBeforeDiff = options._diff;
let oldBeforeRender = options._render;
let oldBeforeCommit = options._commit;
let oldHook = options._hook;
let oldCatchError = options._catchError;

export const vnodeSpy = vi.fn(oldVNode);
export const eventSpy = vi.fn(oldEvent);
export const afterDiffSpy = vi.fn(oldAfterDiff);
export const unmountSpy = vi.fn(oldUnmount);

export const rootSpy = vi.fn(oldRoot);
export const beforeDiffSpy = vi.fn(oldBeforeDiff);
export const beforeRenderSpy = vi.fn(oldBeforeRender);
export const beforeCommitSpy = vi.fn(oldBeforeCommit);
export const hookSpy = vi.fn(oldHook);
export const catchErrorSpy = vi.fn(oldCatchError);

options.vnode = vnodeSpy;
options.event = eventSpy;
options.diffed = afterDiffSpy;
options.unmount = unmountSpy;
options._root = rootSpy;
options._diff = beforeDiffSpy;
options._render = beforeRenderSpy;
options._commit = beforeCommitSpy;
options._hook = hookSpy;
options._catchError = catchErrorSpy;
