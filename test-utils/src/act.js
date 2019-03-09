import { options } from 'preact';
import { setupRerender } from './helpers';

export function act(cb) {
	const rerender = setupRerender();
	let flush;
	options.afterPaint = (fc) => flush = fc;
	cb();
	flush();
	rerender();
	options.afterPaint = undefined;
}
