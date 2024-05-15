import { createElement, render, lazy, Suspense } from 'preact/compat';
import 'preact/debug';
import { setupRerender } from 'preact/test-utils';
import {
	setupScratch,
	teardown,
	serializeHtml
} from '../../../test/_util/helpers';

/** @jsx createElement */

describe('debug with suspense', () => {
	/** @type {HTMLDivElement} */
	let scratch;
	let rerender;
	let errors = [];
	let warnings = [];

	beforeEach(() => {
		errors = [];
		warnings = [];
		scratch = setupScratch();
		rerender = setupRerender();
		sinon.stub(console, 'error').callsFake(e => errors.push(e));
		sinon.stub(console, 'warn').callsFake(w => warnings.push(w));
	});

	afterEach(() => {
		console.error.restore();
		console.warn.restore();
		teardown(scratch);
	});

	it('should throw on missing <Suspense>', () => {
		function Foo() {
			throw Promise.resolve();
		}

		expect(() => render(<Foo />, scratch)).to.throw;
	});

	it('should throw an error when using lazy and missing Suspense', () => {
		const Foo = () => <div>Foo</div>;
		const LazyComp = lazy(
			() => new Promise(resolve => resolve({ default: Foo }))
		);
		const fn = () => {
			render(<LazyComp />, scratch);
		};

		expect(fn).to.throw(/Missing Suspense/gi);
	});

	describe('PropTypes', () => {
		it('should validate propTypes inside lazy()', () => {
			function Baz(props) {
				return <h1>{props.unhappy}</h1>;
			}

			Baz.propTypes = {
				unhappy: function alwaysThrows(obj, key) {
					if (obj[key] === 'signal') throw Error('got prop inside lazy()');
				}
			};

			const loader = Promise.resolve({ default: Baz });
			const LazyBaz = lazy(() => loader);

			const suspense = (
				<Suspense fallback={<div>fallback...</div>}>
					<LazyBaz unhappy="signal" />
				</Suspense>
			);
			render(suspense, scratch);
			rerender(); // render fallback

			expect(console.error).to.not.be.called;
			expect(serializeHtml(scratch)).to.equal('<div>fallback...</div>');

			return loader.then(() => {
				rerender();
				expect(errors.length).to.equal(1);
				expect(errors[0].includes('got prop')).to.equal(true);
				expect(serializeHtml(scratch)).to.equal('<h1>signal</h1>');
			});
		});

		describe('warn for PropTypes on lazy()', () => {
			it('should log the function name', () => {
				const loader = Promise.resolve({
					default: function MyLazyLoaded() {
						return <div>Hi there</div>;
					}
				});
				const FakeLazy = lazy(() => loader);
				FakeLazy.propTypes = {};
				const suspense = (
					<Suspense fallback={<div>fallback...</div>}>
						<FakeLazy />
					</Suspense>
				);
				render(suspense, scratch);
				rerender(); // Render fallback

				expect(serializeHtml(scratch)).to.equal('<div>fallback...</div>');

				return loader.then(() => {
					rerender();
					expect(console.warn).to.be.calledTwice;
					expect(warnings[1].includes('MyLazyLoaded')).to.equal(true);
					expect(serializeHtml(scratch)).to.equal('<div>Hi there</div>');
				});
			});

			it('should log the displayName', () => {
				function MyLazyLoadedComponent() {
					return <div>Hi there</div>;
				}
				MyLazyLoadedComponent.displayName = 'HelloLazy';
				const loader = Promise.resolve({ default: MyLazyLoadedComponent });
				const FakeLazy = lazy(() => loader);
				FakeLazy.propTypes = {};
				const suspense = (
					<Suspense fallback={<div>fallback...</div>}>
						<FakeLazy />
					</Suspense>
				);
				render(suspense, scratch);
				rerender(); // Render fallback

				expect(serializeHtml(scratch)).to.equal('<div>fallback...</div>');

				return loader.then(() => {
					rerender();
					expect(console.warn).to.be.calledTwice;
					expect(warnings[1].includes('HelloLazy')).to.equal(true);
					expect(serializeHtml(scratch)).to.equal('<div>Hi there</div>');
				});
			});

			it("should not log a component if lazy loader's Promise rejects", () => {
				const loader = Promise.reject(new Error('Hey there'));
				const FakeLazy = lazy(() => loader);
				FakeLazy.propTypes = {};
				render(
					<Suspense fallback={<div>fallback...</div>}>
						<FakeLazy />
					</Suspense>,
					scratch
				);
				rerender(); // Render fallback

				expect(serializeHtml(scratch)).to.equal('<div>fallback...</div>');

				return loader.catch(() => {
					try {
						rerender();
					} catch (e) {
						// Ignore the loader's bubbling error
					}

					// Called once on initial render, and again when promise rejects
					expect(console.warn).to.be.calledTwice;
				});
			});

			it("should not log a component if lazy's loader throws", () => {
				const FakeLazy = lazy(() => {
					throw new Error('Hello');
				});
				FakeLazy.propTypes = {};
				let error;
				try {
					render(
						<Suspense fallback={<div>fallback...</div>}>
							<FakeLazy />
						</Suspense>,
						scratch
					);
				} catch (e) {
					error = e;
				}

				expect(console.warn).to.be.calledOnce;
				expect(error).not.to.be.undefined;
				expect(error.message).to.eql('Hello');
			});
		});
	});
});
