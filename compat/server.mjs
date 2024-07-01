import { renderToString } from 'preact-render-to-string';

export {
	renderToString,
	renderToString as renderToStaticMarkup
} from 'preact-render-to-string';

export { renderToPipeableStream } from 'preact-render-to-string/stream-node'

export default {
	renderToString,
	renderToStaticMarkup: renderToString,
	renderToPipeableStream
};
