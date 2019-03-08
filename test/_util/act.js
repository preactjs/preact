import { options } from 'preact';
import { setupRerender } from './setupRerender';

export function act(cb) {
	const rerender = setupRerender();
	let flush;
	options.afterPaint = (fc) => flush = fc;
	cb();
	flush();
	rerender();
	options.afterPaint = undefined;
}
