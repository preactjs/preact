import { createElement, render } from 'preact';
import {
	setupScratch,
	teardown,
	serializeHtml
} from '../../../test/_util/helpers';
import './fakeDevTools';
import { resetPropWarnings } from 'preact/debug';
import * as PropTypes from 'prop-types';
import { jsxDEV as jsxDev } from 'preact/jsx-runtime';

describe('PropTypes', () => {
	/** @type {HTMLDivElement} */
	let scratch;
	let errors = [];
	let warnings = [];

	beforeEach(() => {
		errors = [];
		warnings = [];
		scratch = setupScratch();
		sinon.stub(console, 'error').callsFake(e => errors.push(e));
		sinon.stub(console, 'warn').callsFake(w => warnings.push(w));
	});

	afterEach(() => {
		/** @type {*} */
		console.error.restore();
		console.warn.restore();
		teardown(scratch);
	});

	beforeEach(() => {
		resetPropWarnings();
	});

	it("should fail if props don't match prop-types", () => {
		function Foo(props) {
			return jsxDev('h1', { children: props.text });
		}

		Foo.propTypes = {
			text: PropTypes.string.isRequired
		};

		// @ts-ignore
		render(
			jsxDev(
				Foo,
				{ text: 123 },
				null,
				false,
				{ fileName: './debug/test/browser/debug.test.js', lineNumber: 41 },
				'self'
			),
			scratch
		);

		expect(console.error).to.be.calledOnce;

		// The message here may change when the "prop-types" library is updated,
		// but we check it exactly to make sure all parameters were supplied
		// correctly.
		expect(console.error).to.have.been.calledOnceWith(
			sinon.match(
				/^Failed prop type: Invalid prop `text` of type `number` supplied to `Foo`, expected `string`\.\n {2}in Foo \(at (.*)[/\\]debug[/\\]test[/\\]browser[/\\]debug\.test\.js:[0-9]+\)$/m
			)
		);
	});

	it('should only log a given prop type error once', () => {
		function Foo(props) {
			return jsxDev('h1', { children: props.text });
		}

		Foo.propTypes = {
			text: PropTypes.string.isRequired,
			count: PropTypes.number
		};

		// Trigger the same error twice. The error should only be logged
		// once.
		render(jsxDev(Foo, { text: 123 }), scratch);
		render(jsxDev(Foo, { text: 123 }), scratch);

		expect(console.error).to.be.calledOnce;

		// Trigger a different error. This should result in a new log
		// message.
		console.error.resetHistory();
		render(jsxDev(Foo, { text: 'ok', count: '123' }), scratch);
		expect(console.error).to.be.calledOnce;
	});

	it('should render with error logged when validator gets signal and throws exception', () => {
		function Baz(props) {
			return jsxDev('h1', { children: props.unhappy });
		}

		Baz.propTypes = {
			unhappy: function alwaysThrows(obj, key) {
				if (obj[key] === 'signal') throw Error('got prop');
			}
		};

		render(jsxDev(Baz, { unhappy: 'signal' }), scratch);

		expect(console.error).to.be.calledOnce;
		expect(errors[0].includes('got prop')).to.equal(true);
		expect(serializeHtml(scratch)).to.equal('<h1>signal</h1>');
	});

	it('should not print to console when types are correct', () => {
		function Bar(props) {
			return jsxDev('h1', { children: props.text });
		}

		Bar.propTypes = {
			text: PropTypes.string.isRequired
		};

		render(jsxDev(Bar, { text: 'foo' }), scratch);
		expect(console.error).to.not.be.called;
	});
});
