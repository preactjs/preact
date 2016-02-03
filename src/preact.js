import h from './h';
import Component from './component';
import render from './render';
import { rerender } from './render-queue';
import options from './options';

export default {
	h,
	Component,
	render,
	rerender,
	options,
	hooks: options
};
