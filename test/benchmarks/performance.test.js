/*global coverage, ENABLE_PERFORMANCE*/
/*eslint no-console:0*/
/** @jsx createElement */
import { setupScratch, teardown } from '../_util/helpers';
import {
	createElement,
	Component,
	render,
	hydrate
} from 'preact/dist/preact.module';

const MULTIPLIER = ENABLE_PERFORMANCE ? (coverage ? 5 : 1) : 999999;

// let now = typeof performance!=='undefined' && performance.now ? () => performance.now() : () => +new Date();
if (typeof performance == 'undefined') {
	window.performance = { now: () => +new Date() };
}

function loop(iter, time) {
	let start = performance.now(),
		count = 0;
	while (performance.now() - start < time) {
		count++;
		iter();
	}
	return count;
}

function benchmark(iter, callback) {
	let a = 0; // eslint-disable-line no-unused-vars
	function noop() {
		try {
			a++;
		} finally {
			a += Math.random();
		}
	}

	// warm
	for (let i = 100; i--; ) noop(), iter();

	let count = 4,
		time = 500,
		passes = 0,
		noops = loop(noop, time),
		iterations = 0;

	function next() {
		iterations += loop(iter, time);
		setTimeout(++passes === count ? done : next, 10);
	}

	function done() {
		let ticks = Math.round((noops / iterations) * count),
			hz = (iterations / count / time) * 1000,
			message = `${hz | 0}/s (${ticks} ticks)`;
		callback({ iterations, noops, count, time, ticks, hz, message });
	}

	next();
}

describe('performance', function() {
	let scratch;

	this.timeout(10000);

	before(function() {
		if (!ENABLE_PERFORMANCE) this.skip();
		if (coverage) {
			console.warn(
				'WARNING: Code coverage is enabled, which dramatically reduces performance. Do not pay attention to these numbers.'
			);
		}
	});

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should rerender without changes fast', done => {
		let jsx = (
			<div class="foo bar" data-foo="bar" p={2}>
				<header>
					<h1 class="asdf">
						a {'b'} c {0} d
					</h1>
					<nav>
						<a href="/foo">Foo</a>
						<a href="/bar">Bar</a>
					</nav>
				</header>
				<main>
					<form onSubmit={() => {}}>
						<input type="checkbox" checked />
						<input type="checkbox" checked={false} />
						<fieldset>
							<label>
								<input type="radio" checked />
							</label>
							<label>
								<input type="radio" />
							</label>
						</fieldset>
						<button-bar>
							<button style="width:10px; height:10px; border:1px solid #FFF;">
								Normal CSS
							</button>
							<button style="top:0 ; right: 20">Poor CSS</button>
							<button
								style="invalid-prop:1;padding:1px;font:12px/1.1 arial,sans-serif;"
								icon
							>
								Poorer CSS
							</button>
							<button
								style={{ margin: 0, padding: '10px', overflow: 'visible' }}
							>
								Object CSS
							</button>
						</button-bar>
					</form>
				</main>
			</div>
		);

		benchmark(
			() => {
				render(jsx, scratch);
			},
			({ ticks, message }) => {
				console.log(`PERF: empty diff: ${message}`);
				expect(ticks).to.be.below(150 * MULTIPLIER);
				done();
			}
		);
	});

	it('should rerender repeated trees fast', done => {
		class Header extends Component {
			render() {
				return (
					<header>
						<h1 class="asdf">
							a {'b'} c {0} d
						</h1>
						<nav>
							<a href="/foo">Foo</a>
							<a href="/bar">Bar</a>
						</nav>
					</header>
				);
			}
		}
		class Form extends Component {
			render() {
				return (
					<form onSubmit={() => {}}>
						<input type="checkbox" checked />
						<input type="checkbox" checked={false} />
						<fieldset>
							<label>
								<input type="radio" checked />
							</label>
							<label>
								<input type="radio" />
							</label>
						</fieldset>
						<ButtonBar />
					</form>
				);
			}
		}
		class ButtonBar extends Component {
			render() {
				return (
					<button-bar>
						<Button style="width:10px; height:10px; border:1px solid #FFF;">
							Normal CSS
						</Button>
						<Button style="top:0 ; right: 20">Poor CSS</Button>
						<Button
							style="invalid-prop:1;padding:1px;font:12px/1.1 arial,sans-serif;"
							icon
						>
							Poorer CSS
						</Button>
						<Button style={{ margin: 0, padding: '10px', overflow: 'visible' }}>
							Object CSS
						</Button>
					</button-bar>
				);
			}
		}
		class Button extends Component {
			render(props) {
				return <button {...props} />;
			}
		}
		class Main extends Component {
			render() {
				return <Form />;
			}
		}
		class Root extends Component {
			render() {
				return (
					<div class="foo bar" data-foo="bar" p={2}>
						<Header />
						<Main />
					</div>
				);
			}
		}
		class Empty extends Component {
			render() {
				return <div />;
			}
		}
		class Parent extends Component {
			render({ child: C }) {
				return <C />;
			}
		}

		benchmark(
			() => {
				render(<Parent child={Root} />, scratch);
				render(<Parent child={Empty} />, scratch);
			},
			({ ticks, message }) => {
				console.log(`PERF: repeat diff: ${message}`);
				expect(ticks).to.be.below(3000 * MULTIPLIER);
				done();
			}
		);
	});

	it('should construct large VDOM trees fast', done => {
		const FIELDS = [];
		for (let i = 100; i--; ) FIELDS.push((i * 999).toString(36));

		let out = [];
		function digest(vnode) {
			out.push(vnode);
			out.length = 0;
		}
		benchmark(
			() => {
				digest(
					<div class="foo bar" data-foo="bar" p={2}>
						<header>
							<h1 class="asdf">
								a {'b'} c {0} d
							</h1>
							<nav>
								<a href="/foo">Foo</a>
								<a href="/bar">Bar</a>
							</nav>
						</header>
						<main>
							<form onSubmit={() => {}}>
								<input type="checkbox" checked />
								<input type="checkbox" />
								<fieldset>
									{FIELDS.map(field => (
										<label>
											{field}:
											<input placeholder={field} />
										</label>
									))}
								</fieldset>
								<button-bar>
									<button style="width:10px; height:10px; border:1px solid #FFF;">
										Normal CSS
									</button>
									<button style="top:0 ; right: 20">Poor CSS</button>
									<button
										style="invalid-prop:1;padding:1px;font:12px/1.1 arial,sans-serif;"
										icon
									>
										Poorer CSS
									</button>
									<button
										style={{ margin: 0, padding: '10px', overflow: 'visible' }}
									>
										Object CSS
									</button>
								</button-bar>
							</form>
						</main>
					</div>
				);
			},
			({ ticks, message }) => {
				console.log(`PERF: large VTree: ${message}`);
				expect(ticks).to.be.below(200 * MULTIPLIER);
				done();
			}
		);
	});

	it('should mutate styles/properties quickly', done => {
		let counter = 0;
		const keyLooper = n => c => (c % n ? `${c}px` : c);
		const get = (obj, i) => obj[i % obj.length];
		const CLASSES = ['foo', 'foo bar', '', 'baz-bat', null];
		const STYLES = [];
		const MULTIVALUE = [
			'0 1px',
			'0 0 1px 0',
			'0',
			'1px',
			'20px 10px',
			'7em 5px',
			'1px 0 5em 2px'
		];
		const STYLEKEYS = [
			['left', keyLooper(3)],
			['top', keyLooper(2)],
			['margin', c => get(MULTIVALUE, c).replace('1px', c + 'px')],
			['padding', c => get(MULTIVALUE, c)],
			['position', c => (c % 5 ? (c % 2 ? 'absolute' : 'relative') : null)],
			['display', c => (c % 10 ? (c % 2 ? 'block' : 'inline') : 'none')],
			[
				'color',
				c =>
					`rgba(${c % 255}, ${255 - (c % 255)}, ${50 + (c % 150)}, ${(c % 50) /
						50})`
			],
			[
				'border',
				c =>
					c % 5
						? `${c % 10}px ${c % 2 ? 'solid' : 'dotted'} ${STYLEKEYS[6][1](c)}`
						: ''
			]
		];
		for (let i = 0; i < 1000; i++) {
			let style = {};
			for (let j = 0; j < i % 10; j++) {
				let conf = get(STYLEKEYS, ++counter);
				style[conf[0]] = conf[1](counter);
			}
			STYLES[i] = style;
		}

		const app = index => (
			<div
				class={get(CLASSES, index)}
				data-index={index}
				title={index.toString(36)}
			>
				<input type="checkbox" checked={index % 3 == 0} />
				<input
					value={`test ${(index / 4) | 0}`}
					disabled={index % 10 ? null : true}
				/>
				<div class={get(CLASSES, index * 10)}>
					<p style={get(STYLES, index)}>p1</p>
					<p style={get(STYLES, index + 1)}>p2</p>
					<p style={get(STYLES, index * 2)}>p3</p>
					<p style={get(STYLES, index * 3 + 1)}>p4</p>
				</div>
			</div>
		);

		let count = 0;
		benchmark(
			() => {
				render(app(++count), scratch);
			},
			({ ticks, message }) => {
				console.log(`PERF: style/prop mutation: ${message}`);
				expect(ticks).to.be.below(350 * MULTIPLIER);
				done();
			}
		);
	});

	it('should hydrate from SSR quickly', done => {
		class Header extends Component {
			render() {
				return (
					<header>
						<h1 class="asdf">
							a {'b'} c {0} d
						</h1>
						<nav>
							<a href="/foo">Foo</a>
							<a href="/bar">Bar</a>
						</nav>
					</header>
				);
			}
		}
		class Form extends Component {
			render() {
				return (
					<form onSubmit={() => {}}>
						<input type="checkbox" checked />
						<input type="checkbox" checked={false} />
						<fieldset>
							<label>
								<input type="radio" checked />
							</label>
							<label>
								<input type="radio" />
							</label>
						</fieldset>
						<ButtonBar />
					</form>
				);
			}
		}
		const ButtonBar = () => (
			<button-bar>
				<Button style="width:10px; height:10px; border:1px solid #FFF;">
					Normal CSS
				</Button>
				<Button style="top:0 ; right: 20">Poor CSS</Button>
				<Button
					style="invalid-prop:1;padding:1px;font:12px/1.1 arial,sans-serif;"
					icon
				>
					Poorer CSS
				</Button>
				<Button style={{ margin: 0, padding: '10px', overflow: 'visible' }}>
					Object CSS
				</Button>
			</button-bar>
		);
		class Button extends Component {
			handleClick() {}
			render(props) {
				return <button onClick={this.handleClick} {...props} />;
			}
		}
		const Main = () => <Form />;
		class App extends Component {
			render() {
				return (
					<div class="foo bar" data-foo="bar" p={2}>
						<Header />
						<Main />
					</div>
				);
			}
		}

		render(<App />, scratch);
		let html = scratch.innerHTML;

		benchmark(
			() => {
				scratch.innerHTML = html;
				hydrate(<App />, scratch);
			},
			({ ticks, message }) => {
				console.log(`PERF: SSR Hydrate: ${message}`);
				expect(ticks).to.be.below(3000 * MULTIPLIER);
				done();
			}
		);
	});
});
