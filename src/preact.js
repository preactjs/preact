import _h from './h';
import _Component from './component';
import _render from './render';
import { rerender as _rerender } from './render-queue';
import _options from './options';

export default {
	h: _h,
	Component: _Component,
	render: _render,
	rerender: _rerender,
	options: _options,
	hooks: _options
};

export const h = _h;
export const Component = _Component;
export const render = _render;
export const rerender = _rerender;
export const options = _options;
export const hooks = _options;
