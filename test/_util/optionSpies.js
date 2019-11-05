import { options as rawOptions } from 'preact';

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

export const vnodeSpy = sinon.spy(oldVNode);
export const eventSpy = sinon.spy(oldEvent);
export const afterDiffSpy = sinon.spy(oldAfterDiff);
export const unmountSpy = sinon.spy(oldUnmount);

export const rootSpy = sinon.spy(oldRoot);
export const beforeDiffSpy = sinon.spy(oldBeforeDiff);
export const beforeRenderSpy = sinon.spy(oldBeforeRender);
export const beforeCommitSpy = sinon.spy(oldBeforeCommit);
export const hookSpy = sinon.spy(oldHook);
export const catchErrorSpy = sinon.spy(oldCatchError);

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
