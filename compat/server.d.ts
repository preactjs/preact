// @ts-nocheck moduleResolution "node" (node10) can't resolve the streaming
// subpaths of preact-render-to-string, which would error with skipLibCheck off.
// There the stream renderers are typed as `any`; everywhere else they resolve.
import { renderToString as _renderToString } from 'preact-render-to-string';
import { renderToPipeableStream as _renderToPipeableStream } from 'preact-render-to-string/stream-node';
import { renderToReadableStream as _renderToReadableStream } from 'preact-render-to-string/stream';

// A namespace + `export =` matches both builds: the CJS `module.exports` object
// and the ESM named exports plus default export.
declare namespace ReactDOMServer {
	export const renderToString: typeof _renderToString;
	export const renderToStaticMarkup: typeof _renderToString;
	export const renderToPipeableStream: typeof _renderToPipeableStream;
	export const renderToReadableStream: typeof _renderToReadableStream;
}

export = ReactDOMServer;
