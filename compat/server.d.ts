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
