import { createElement, render, createRef } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import './fakeDevTools';
import 'preact/debug';
import * as PropTypes from 'prop-types';

// eslint-disable-next-line no-duplicate-imports
import { resetPropWarnings } from 'preact/debug';
import { forwardRef, createPortal } from 'preact/compat';
import { vi } from 'vitest';

const h = createElement;

describe('debug compat', () => {
	let scratch;
	let root;
	let errors = [];
	let warnings = [];

	beforeEach(() => {
		errors = [];
		warnings = [];
		scratch = setupScratch();
		vi.spyOn(console, 'error').mockImplementation(e => errors.push(e));
		vi.spyOn(console, 'warn').mockImplementation(w => warnings.push(w));

		root = document.createElement('div');
		document.body.appendChild(root);
	});

	afterEach(() => {
		/** @type {*} */
		console.error.mockRestore();
		console.warn.mockRestore();
		teardown(scratch);

		document.body.removeChild(root);
	});

	describe('portals', () => {
		it('should not throw an invalid render argument for a portal.', () => {
			function Foo(props) {
				return <div>{createPortal(props.children, root)}</div>;
			}
			expect(() => render(<Foo>foobar</Foo>, scratch)).not.to.throw();
		});
	});

	describe('PropTypes', () => {
		beforeEach(() => {
			resetPropWarnings();
		});

		it('should not fail if ref is passed to comp wrapped in forwardRef', () => {
			// This test ensures compat with airbnb/prop-types-exact, mui exact prop types util, etc.

			const Foo = forwardRef(function Foo(props, ref) {
				return <h1 ref={ref}>{props.text}</h1>;
			});

			Foo.propTypes = {
				text: PropTypes.string.isRequired,
				ref(props) {
					if ('ref' in props) {
						throw new Error(
							'ref should not be passed to prop-types valiation!'
						);
					}
				}
			};

			const ref = createRef();

			render(<Foo ref={ref} text="123" />, scratch);

			expect(console.error).not.toHaveBeenCalled();

			expect(ref.current).to.not.be.undefined;
		});
	});
});
