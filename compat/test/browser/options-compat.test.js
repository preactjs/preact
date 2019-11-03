import { vnodeSpy, eventSpy } from '../../../test/_util/optionSpies';
import React, {
	createElement,
	render,
	Component,
	createRef
} from 'preact/compat';
import { setupRerender } from 'preact/test-utils';
import {
	setupScratch,
	teardown,
	createEvent
} from '../../../test/_util/helpers';

describe('compat options', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	/** @type {() => void} */
	let increment;

	/** @type {import('../../src/index').PropRef<HTMLButtonElement | null>} */
	let buttonRef;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();

		vnodeSpy.resetHistory();
		eventSpy.resetHistory();

		buttonRef = createRef();
	});

	afterEach(() => {
		teardown(scratch);
	});

	class ClassApp extends Component {
		constructor() {
			super();
			this.state = { count: 0 };
			increment = () =>
				this.setState(({ count }) => ({
					count: count + 1
				}));
		}

		render() {
			return (
				<button ref={buttonRef} onClick={increment}>
					{this.state.count}
				</button>
			);
		}
	}

	it('should call old options on mount', () => {
		render(<ClassApp />, scratch);

		expect(vnodeSpy).to.have.been.called;
	});

	it('should call old options on event and update', () => {
		render(<ClassApp />, scratch);
		expect(scratch.innerHTML).to.equal('<button>0</button>');

		buttonRef.current.dispatchEvent(createEvent('click'));
		rerender();
		expect(scratch.innerHTML).to.equal('<button>1</button>');

		expect(vnodeSpy).to.have.been.called;
		expect(eventSpy).to.have.been.called;
	});

	it('should call old options on unmount', () => {
		render(<ClassApp />, scratch);
		render(null, scratch);

		expect(vnodeSpy).to.have.been.called;
	});
});
