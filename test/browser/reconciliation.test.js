// import { setupRerender } from 'preact/test-utils';
import { createElement as h, render } from '../../src/index';
import { setupScratch, teardown } from '../_util/helpers';
import { clearLog, getLog, logCall } from '../_util/logCall';

/** @jsx h */

describe('reconciliation', () => {
	let scratch;
	// let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		// rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	before(() => {
		logCall(Element.prototype, 'appendChild');
		logCall(Element.prototype, 'insertBefore');
		logCall(Element.prototype, 'removeChild');
		logCall(Element.prototype, 'replaceChild');
		logCall(Element.prototype, 'setAttribute');
		logCall(Element.prototype, 'remove');
	});

	it('should reorder child pairs', () => {
		render((
			<div>
				<a>a</a>
				<b>b</b>
			</div>
		), scratch);
		clearLog();

		render((
			<div>
				<b>b</b>
				<a>a</a>
			</div>
		), scratch);

		// expect(getLog()).to.deep.equal([
		// 	`<div>.insertBefore(<b>b</b>, <a>a</a>)`
		// ]);
		expect(getLog()).to.deep.equal([
			`<div>.appendChild(<a>a)`
		]);
	});

	it('should insert new items in the middle of a list', () => {
		render((
			<ul>
				<li>A</li>
				<li>B</li>
				<li>C</li>
			</ul>
		), scratch);
		clearLog();

		render((
			<ul>
				<li>A</li>
				<li>NEW</li>
				<li>B</li>
				<li>C</li>
			</ul>
		), scratch);

		expect(getLog()).to.deep.equal([
			`<ul>ANEWB.insertBefore(<li>NEW, <li>B)`
		]);
	});
});
