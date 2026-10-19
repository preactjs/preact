import React from '../../src';
import {
	renderToString,
	renderToStaticMarkup,
	renderToReadableStream
} from '../../server';
import ReactDOMServer from '../../server';
import * as ReactDOMServerStar from '../../server';

const named: string = renderToString(<div />);
const markup: string = renderToStaticMarkup(<div />);
const fromDefault: string = ReactDOMServer.renderToString(<div />);
const fromStar: string = ReactDOMServerStar.renderToStaticMarkup(<div />);
const stream = renderToReadableStream(<div />);

// @ts-expect-error renderToString takes a vnode
renderToString('div');

export { named, markup, fromDefault, fromStar, stream };
