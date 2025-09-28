import React, { createElement, findDOMNode } from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('findDOMNode()', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	class Helper extends React.Component {
		render({ something }) {
			if (something == null) return null;
			if (something === false) return null;
			return <div />;
		}
	}

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it.skip('should return DOM Node if render is not false nor null', () => {
		const helper = React.render(<Helper />, scratch);
		expect(findDOMNode(helper)).to.be.instanceof(Node);
	});

	it('should return null if given null', () => {
		expect(findDOMNode(null)).to.be.null;
	});

	it('should return a regular DOM Element if given a regular DOM Element', () => {
		let scratch = document.createElement('div');
		expect(findDOMNode(scratch)).to.equalNode(scratch);
	});

	// NOTE: React.render() returning false or null has the component pointing
	// 			to no DOM Node, in contrast, Preact always render an empty Text DOM Node.
	it('should return null if render returns false', () => {
		const helper = React.render(<Helper something={false} />, scratch);
		expect(findDOMNode(helper)).to.be.null;
	});

	// NOTE: React.render() returning false or null has the component pointing
	// 			to no DOM Node, in contrast, Preact always render an empty Text DOM Node.
	it('should return null if render returns null', () => {
		const helper = React.render(<Helper something={null} />, scratch);
		expect(findDOMNode(helper)).to.be.null;
	});
});
