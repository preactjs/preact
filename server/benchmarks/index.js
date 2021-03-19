import { h } from 'preact';
import Suite from 'benchmarkjs-pretty';
import renderToStringBaseline from './lib/render-to-string';
import renderToString from '../src/index';
import TextApp from './text';
// import StackApp from './stack';
import { App as IsomorphicSearchResults } from './isomorphic-ui-search-results';

function suite(name, Root) {
	return new Suite(name)
		.add('baseline', () => renderToStringBaseline(<Root />))
		.add('current', () => renderToString(<Root />))
		.run();
}

(async () => {
	await suite('Text', TextApp);
	await suite('SearchResults', IsomorphicSearchResults);
	// TODO: Enable this once we switched away from recursion
	// await suite('Stack Depth', StackApp);
})();
