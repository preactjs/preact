import { setupRerender } from 'preact/test-utils';
import React, {
	createElement,
	render,
	Component,
	Suspense,
	createContext
} from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { createSuspenseLoader } from './suspense-utils';

const h = React.createElement;
/* eslint-env browser */

/**
 * Regression test for the Suspense boundary minification collision.
 *
 * Root cause: preact's mangle.json mapped `_id` — the identifier on every
 * context object created by `createContext` — to the same minified name
 * (`__c`) as Suspense's `_childDidSuspend`. In built output, the
 * `_catchError` hook's check `component._childDidSuspend` became
 * `component.__c`, which falsely matched any component carrying a
 * context's `_id` (e.g. when a context object is used as a component).
 *
 * The fix gives `_id` a unique mangled name (`__I`). `_childDidSuspend`
 * keeps `__c`: other repos (e.g. preact-iso's router) rely on that name,
 * so renaming it would be a breaking change.
 *
 * The collision test below runs against the minified build (MINIFY=true):
 * the vitest rename plugin applies mangle.json to this file too, so
 * `this._id` becomes the minified `_id` name just like in real builds.
 * In source mode the test passes regardless (no collision in source),
 * but documents the expected behavior.
 */
describe('suspense boundary detection', () => {
	/** @type {HTMLDivElement} */
	let scratch, rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it("should not mistake a context's _id for a Suspense boundary", () => {
		const Ctx = createContext(null);
		const [useLoader, resolve] = createSuspenseLoader();

		function Loader() {
			const data = useLoader();
			return <div>data: {data}</div>;
		}

		// Context objects carry `_id`. If one ends up as the component in
		// the boundary walk (a context is a function, so it can be used as
		// a component), its `_id` must not be mistaken for Suspense's
		// `_childDidSuspend`. Use the real `_id` from a real context.
		class ContextAsComponent extends Component {
			constructor(props) {
				super(props);
				// _id -> __c in built output on main (collides)
				this._id = Ctx._id;
			}
			render() {
				return <div class="ctx">{this.props.children}</div>;
			}
		}

		render(
			<Suspense fallback={<div>loading...</div>}>
				<ContextAsComponent>
					<Loader />
				</ContextAsComponent>
			</Suspense>,
			scratch
		);
		rerender();

		// The real Suspense boundary must catch the promise, not the fake.
		// On main (MINIFY), the hook calls the `_id` string as the suspend
		// handler: `TypeError: ...__c is not a function`.
		expect(scratch.innerHTML).to.contain('loading...');

		return resolve('hello').then(() => {
			rerender();
			expect(scratch.innerHTML).to.contain('data: hello');
			expect(scratch.innerHTML).to.not.contain('loading...');
		});
	});

	it('should catch promise thrown through provider components', () => {
		const [useLoader, resolve] = createSuspenseLoader();

		function Loader() {
			const data = useLoader();
			return <div>data: {data}</div>;
		}

		function Provider(props) {
			return <div class="provider">{props.children}</div>;
		}

		render(
			<Provider>
				<Suspense fallback={<div>loading...</div>}>
					<Provider>
						<Loader />
					</Provider>
				</Suspense>
			</Provider>,
			scratch
		);
		rerender();

		expect(scratch.innerHTML).to.contain('loading...');

		return resolve('hello').then(() => {
			rerender();
			expect(scratch.innerHTML).to.contain('data: hello');
		});
	});

	it('should prefer the nearest Suspense boundary', () => {
		const [useLoader, resolve] = createSuspenseLoader();

		function Loader() {
			const data = useLoader();
			return <span>{data}</span>;
		}

		render(
			<Suspense fallback={<div>outer loading</div>}>
				<div>
					<Suspense fallback={<div>inner loading</div>}>
						<Loader />
					</Suspense>
				</div>
			</Suspense>,
			scratch
		);
		rerender();

		expect(scratch.innerHTML).to.contain('inner loading');
		expect(scratch.innerHTML).to.not.contain('outer loading');

		return resolve('done').then(() => {
			rerender();
			expect(scratch.textContent).to.contain('done');
		});
	});
});
