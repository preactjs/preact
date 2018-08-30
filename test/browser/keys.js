import { createElement as h, Component, render } from '../../src/index';
import { setupScratch, teardown } from './helpers';

/** @jsx h */

describe('keys', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	// See developit/preact-compat#21
	it('should remove orphaned keyed nodes', () => {
		const root = render((
			<div>
				<div>1</div>
				<li key="a">a</li>
				<li key="b">b</li>
			</div>
		), scratch);

		render((
			<div>
				<div>2</div>
				<li key="b">b</li>
				<li key="c">c</li>
			</div>
		), scratch, root);

		expect(scratch.innerHTML).to.equal('<div><div>2</div><li>b</li><li>c</li></div>');
	});

	it('should set VNode#tag property', () => {
		expect(<div />).to.have.property('tag', 'div');
		function Test() {
			return <div />;
		}
		expect(<Test />).to.have.property('tag', Test);
	});

	it('should set VNode#props property', () => {
		const props = {};
		expect(h('div', props)).to.have.property('props', props);
	});

	it('should set VNode#text property', () => {
		expect(<div />).to.have.property('text', null);
	});

	it('should set VNode#key property', () => {
		expect(<div />).to.have.property('key').that.is.undefined;
		expect(<div a="a" />).to.have.property('key').that.is.undefined;
		expect(<div key="1" />).to.have.property('key', '1');
	});

	it('should have ordered VNode properties', () => {
		expect(Object.keys(<div />).filter(key => !/^_/.test(key))).to.deep.equal(['tag', 'props', 'text', 'key']);
	});

	it('should remove keyed nodes (#232)', () => {
		class App extends Component {
			componentDidMount() {
				setTimeout(() => this.setState({ opened: true,loading: true }), 10);
				setTimeout(() => this.setState({ opened: true,loading: false }), 20);
			}

			render({ opened, loading }) {
				return (
					<BusyIndicator id="app" busy={loading}>
						<div>This div needs to be here for this to break</div>
						{ opened && !loading && <div>{[]}</div> }
					</BusyIndicator>
				);
			}
		}

		class BusyIndicator extends Component {
			render({ children, busy }) {
				return (<div class={busy ? 'busy' : ''}>
					{ children && children.length ? children : <div class="busy-placeholder" /> }
					<div class="indicator">
						<div>indicator</div>
						<div>indicator</div>
						<div>indicator</div>
					</div>
				</div>);
			}
		}

		render(<App />, scratch);
		render(<App opened loading />, scratch);
		render(<App opened />, scratch);

		const html = String(scratch.firstChild.innerHTML).replace(/ class=""/g, '');
		expect(html).to.equal('<div>This div needs to be here for this to break</div><div></div><div class="indicator"><div>indicator</div><div>indicator</div><div>indicator</div></div>');
	});
});
