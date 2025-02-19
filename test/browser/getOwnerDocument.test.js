import { createElement, render } from 'preact';
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

		let rootTextSpy = sinon.spy(document, 'createTextNode');
		let rootElementSpy = sinon.spy(document, 'createElement');

		let iframeTextSpy = sinon.spy(iframeDoc, 'createTextNode');
		let iframeElementSpy = sinon.spy(iframeDoc, 'createElement');

		let iframeRootNode = iframeDoc.querySelector('div');

		render(<span>Hello</span>, iframeRootNode);

		expect(rootTextSpy).not.to.be.called;
		expect(rootElementSpy).not.to.be.called;
		expect(iframeTextSpy).to.be.called;
		expect(iframeElementSpy).to.be.called;

		expect(iframeRootNode.textContent).to.be.equal('Hello');
		expect(iframeRootNode.firstChild.ownerDocument).to.be.equal(iframeDoc);
		expect(iframeRootNode.firstChild.ownerDocument).to.not.be.equal(document);
	});
});
