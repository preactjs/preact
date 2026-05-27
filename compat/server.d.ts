// @ts-nocheck TS loses its mind over the mixed module systems here.
// It's not ideal, but works at runtime and we're not shipping mixed type definitions.

import { renderToString } from 'preact-render-to-string';
import { renderToPipeableStream } from 'preact-render-to-string/stream-node';
import { renderToReadableStream } from 'preact-render-to-string/stream';

export {
	renderToString,
	renderToString as renderToStaticMarkup
} from 'preact-render-to-string';

export { renderToPipeableStream } from 'preact-render-to-string/stream-node';
export { renderToReadableStream } from 'preact-render-to-string/stream';
export = {
	renderToString: typeof renderToString,
	renderToStaticMarkup: typeof renderToString,
	renderToPipeableStream: typeof renderToPipeableStream,
	renderToReadableStream: typeof renderToReadableStream
};
