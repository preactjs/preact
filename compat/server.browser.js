import { renderToString as preactRenderToString } from 'preact-render-to-string';

export const renderToString = preactRenderToString;
export const renderToStaticMarkup = preactRenderToString;

export default {
	renderToString,
	renderToStaticMarkup
};
