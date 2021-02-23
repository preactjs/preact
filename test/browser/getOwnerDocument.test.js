import { render } from 'preact';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx createElement */

describe('parentDom.ownerDocument', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	before(() => {
		scratch = setupScratch();
	});

	after(() => {
		teardown(scratch);
	});

	it('should reference the correct document from the parent node', () => {
		let iframe = document.createElement('iframe');

		scratch.appendChild(iframe);

		let iframeDoc = iframe.contentDocument;

		iframeDoc.write(
			'<!DOCTYPE html><html><head></head><body><div></div></body></html>'
		);

		iframeDoc.close();

		let spy = sinon.spy(iframeDoc, 'createTextNode');

		let iframeRootNode = iframeDoc.querySelector('div');

		render('Hello', iframeRootNode);

		expect(spy).to.be.called;

		expect(iframeRootNode.textContent).to.be.equal('Hello');
		expect(iframeRootNode.firstChild.ownerDocument).to.be.equal(iframeDoc);
		expect(iframeRootNode.firstChild.ownerDocument).to.not.be.equal(document);
	});
});
