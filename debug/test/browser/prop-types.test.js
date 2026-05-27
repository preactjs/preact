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
import { vi } from 'vitest';

describe('PropTypes', () => {
	/** @type {HTMLDivElement} */
	let scratch;
	let errors = [];
	let warnings = [];

	beforeEach(() => {
		errors = [];
		warnings = [];
		scratch = setupScratch();
		vi.spyOn(console, 'error').mockImplementation(e => errors.push(e));
		vi.spyOn(console, 'warn').mockImplementation(w => warnings.push(w));
	});

	afterEach(() => {
		/** @type {*} */
		console.error.mockRestore();
		console.warn.mockRestore();
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

		render(
			jsxDev(
				Foo,
				{ text: 123 },
				null,
				// @ts-ignore
				false,
				// @ts-ignore
				{ fileName: './debug/test/browser/debug.test.js', lineNumber: 41 },
				// @ts-ignore
				'self'
			),
			scratch
		);

		expect(console.error).toHaveBeenCalledOnce();

		// The message here may change when the "prop-types" library is updated,
		// but we check it exactly to make sure all parameters were supplied
		// correctly.
		expect(console.error).toHaveBeenCalledOnce();
		expect(console.error).toHaveBeenCalledWith(
			expect.stringMatching(
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

		expect(console.error).toHaveBeenCalledOnce();

		// Trigger a different error. This should result in a new log
		// message.
		console.error.mockClear();
		render(jsxDev(Foo, { text: 'ok', count: '123' }), scratch);
		expect(console.error).toHaveBeenCalledOnce();
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

		expect(console.error).toHaveBeenCalledOnce();
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
		expect(console.error).not.toHaveBeenCalled();
	});
});
