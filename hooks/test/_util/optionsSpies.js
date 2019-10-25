import { options } from "preact";

let oldBeforeRender = options._render;
let oldAfterDiff = options.diffed;
let oldUnmount = options.unmount;

/** @type {import('sinon').SinonSpy} */
export const beforeRenderSpy = sinon.spy(oldBeforeRender);

/** @type {import('sinon').SinonSpy} */
export const afterDiffSpy = sinon.spy(oldAfterDiff);

/** @type {import('sinon').SinonSpy} */
export const unmountSpy = sinon.spy(oldUnmount);

options._render = beforeRenderSpy;
options.diffed = afterDiffSpy
options.unmount = unmountSpy;
