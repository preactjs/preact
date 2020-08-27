import { createElement, render, createRef } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import './fakeDevTools';
import 'preact/debug';
import 'prop-types';
import sinon from 'sinon';
import { expect } from '@open-wc/testing';

// eslint-disable-next-line no-duplicate-imports
import { resetPropWarnings } from 'preact/debug';
import { forwardRef } from 'preact/compat';

// We include the umd bundle of prop-types, because they don't have an ESM
// version of it. The umd bundle cannot be imported, so we pull it off of
// window.
const PropTypes = window.PropTypes;

describe('debug compat', () => {
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
		(console.error).restore();
		console.warn.restore();
		teardown(scratch);
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

			expect(console.error).not.been.called;

			expect(ref.current).to.not.be.undefined;
		});
	});
});
