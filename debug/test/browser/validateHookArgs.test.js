import { createElement, render, createRef } from 'preact';
import {
	useState,
	useEffect,
	useLayoutEffect,
	useCallback,
	useMemo,
	useImperativeHandle
} from 'preact/hooks';
import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import 'preact/debug';

/** @jsx createElement */

describe('Hook argument validation', () => {
	/**
	 * @param {string} name
	 * @param {(arg: number) => void} hook
	 */
	function validateHook(name, hook) {
		const TestComponent = ({ initialValue }) => {
			const [value, setValue] = useState(initialValue);
			hook(value);

			return (
				<button type="button" onClick={() => setValue(NaN)}>
					Set to NaN
				</button>
			);
		};

		it(`should error if ${name} is mounted with NaN as an argument`, async () => {
			expect(() =>
				render(<TestComponent initialValue={NaN} />, scratch)
			).to.throw(/Hooks should not be called with NaN in the dependency array/);
		});

		it(`should error if ${name} is updated with NaN as an argument`, async () => {
			render(<TestComponent initialValue={0} />, scratch);

			expect(() => {
				scratch.querySelector('button').click();
				rerender();
			}).to.throw(
				/Hooks should not be called with NaN in the dependency array/
			);
		});
	}

	/** @type {HTMLElement} */
	let scratch;
	/** @type {() => void} */
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	validateHook('useEffect', arg => useEffect(() => {}, [arg]));
	validateHook('useLayoutEffect', arg => useLayoutEffect(() => {}, [arg]));
	validateHook('useCallback', arg => useCallback(() => {}, [arg]));
	validateHook('useMemo', arg => useMemo(() => {}, [arg]));

	const ref = createRef();
	validateHook('useImperativeHandle', arg => {
		useImperativeHandle(ref, () => undefined, [arg]);
	});
});
