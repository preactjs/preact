import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { setupScratch, teardown } from '../_util/helpers';

describe('Async Function Component', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should render async function component correctly', async () => {
		const AsyncComponent = async () => {
			await new Promise(resolve => setTimeout(resolve, 50));
			return <div>Async Component</div>;
		};

		render(<AsyncComponent />, scratch);
		await new Promise(resolve => setTimeout(resolve, 100));

		expect(scratch.innerHTML).to.equal('<div>Async Component</div>');
	});

	it('should handle async operations in function component', async () => {
		const AsyncComponent = () => {
			const [data, setData] = useState(null);

			useEffect(() => {
				const fetchData = async () => {
					await new Promise(resolve => setTimeout(resolve, 50));
					setData('Fetched Data');
				};

				fetchData();
			}, []);

			return <div>{data || 'Loading...'}</div>;
		};

		render(<AsyncComponent />, scratch);
		expect(scratch.innerHTML).to.equal('<div>Loading...</div>');

		await new Promise(resolve => setTimeout(resolve, 100));
		expect(scratch.innerHTML).to.equal('<div>Fetched Data</div>');
	});
});
