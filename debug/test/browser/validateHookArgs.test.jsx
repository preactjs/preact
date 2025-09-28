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
import { vi } from 'vitest';

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
			render(<TestComponent initialValue={NaN} />, scratch);
			expect(console.warn).toHaveBeenCalledOnce();
			expect(console.warn.mock.calls[0]).to.match(
				/Hooks should not be called with NaN in the dependency array/
			);
		});

		it(`should error if ${name} is updated with NaN as an argument`, async () => {
			render(<TestComponent initialValue={0} />, scratch);

			scratch.querySelector('button').click();
			rerender();

			expect(console.warn).toHaveBeenCalledOnce();
			expect(console.warn.mock.calls[0]).to.match(
				/Hooks should not be called with NaN in the dependency array/
			);
		});
	}

	/** @type {HTMLElement} */
	let scratch;
	/** @type {() => void} */
	let rerender;
	let warnings = [];

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
		warnings = [];
		vi.spyOn(console, 'warn').mockImplementation(w => warnings.push(w));
	});

	afterEach(() => {
		teardown(scratch);
		console.warn.mockRestore();
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
