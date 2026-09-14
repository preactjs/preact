import { browser, createElement, use } from 'preact/compat';
import { renderToString } from 'preact-render-to-string';
import { vi } from 'vitest';

describe('recoverable rendering without a DOM', () => {
	it('throws its recoverable reason without evaluating it', () => {
		const reason = vi.fn();
		const value = Object.freeze(browser(reason));
		function App() {
			use(value);
		}
		let error;
		try {
			renderToString(createElement(App));
		} catch (caught) {
			error = caught;
		}
		expect(error).to.equal(value.reason);
		expect(reason).not.toHaveBeenCalled();
	});

	it('rejects synchronously and when awaited', async () => {
		const value = browser();
		const reject = vi.fn();
		value.then(null, reject);
		expect(reject).toHaveBeenCalledWith(value.reason);
		await expect(Promise.resolve(value)).rejects.to.equal(value.reason);
	});
});
