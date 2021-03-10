import { h } from 'preact';
import Suite from 'benchmarkjs-pretty';
import renderToString from '../src/index';
import TextApp from './text';
// import StackApp from './stack';
import { App as IsomorphicSearchResults } from './isomorphic-ui-search-results';

new Suite('Bench')
	.add('Text', () => {
		return renderToString(<TextApp />);
	})
	.add('SearchResults', () => {
		return renderToString(<IsomorphicSearchResults />);
	})
	// TODO: Enable this once we switched away from recursion
	// .add('Stack Depth', () => {
	// 	return renderToString(<StackApp />);
	// })
	.run();
