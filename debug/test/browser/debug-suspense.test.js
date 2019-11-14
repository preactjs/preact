import { createElement, render, lazy, Suspense } from 'preact/compat';
import 'preact/debug';
import { setupRerender } from 'preact/test-utils';
import {
	setupScratch,
	teardown,
	serializeHtml
} from '../../../test/_util/helpers';

/** @jsx createElement */

async function waitResolved(suspense) {
	while (suspense._component._suspensions > 0) {
		await new Promise(resolve => {
			setTimeout(resolve, 10);
		});
	}
}

describe('debug with suspense', () => {
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
			const rerender = setupRerender();

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

			expect(console.error).to.not.be.called;

			return loader
				.then(() => waitResolved(suspense))
				.then(() => {
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

				return loader
					.then(() => waitResolved(suspense))
					.then(() => {
						expect(console.warn).to.be.calledTwice;
						expect(warnings[1].includes('MyLazyLoaded')).to.equal(true);
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

				return loader
					.then(() => waitResolved(suspense))
					.then(() => {
						expect(console.warn).to.be.calledTwice;
						expect(warnings[1].includes('HelloLazy')).to.equal(true);
					});
			});

			it('should not log a component if lazy throws', () => {
				const loader = Promise.reject(new Error('Hey there'));
				const FakeLazy = lazy(() => loader);
				FakeLazy.propTypes = {};
				render(
					<Suspense fallback={<div>fallback...</div>}>
						<FakeLazy />
					</Suspense>,
					scratch
				);

				return loader.catch(() => {
					expect(console.warn).to.be.calledOnce;
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
