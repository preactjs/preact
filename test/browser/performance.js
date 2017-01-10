/*global coverage, ENABLE_PERFORMANCE, NODE_ENV*/
/*eslint no-console:0*/
/** @jsx h */

let { h, Component, render } = require(NODE_ENV==='production' ? '../../dist/preact.min.js' : '../../src/preact');

const MULTIPLIER = ENABLE_PERFORMANCE ? (coverage ? 5 : 1) : 999999;


let now = typeof performance!=='undefined' && performance.now ? () => performance.now() : () => +new Date();

function loop(iter, time) {
	let start = now(),
		count = 0;
	while ( now()-start < time ) {
		count++;
		iter();
	}
	return count;
}


function benchmark(iter, callback) {
	let a = 0; // eslint-disable-line no-unused-vars
	function noop() {
		try { a++; } finally { a += Math.random(); }
	}

	// warm
	for (let i=3; i--; ) noop(), iter();

	let count = 5,
		time = 200,
		passes = 0,
		noops = loop(noop, time),
		iterations = 0;

	function next() {
		iterations += loop(iter, time);
		setTimeout(++passes===count ? done : next, 10);
	}

	function done() {
		let ticks = Math.round(noops / iterations * count),
			hz = iterations / count / time * 1000,
			message = `${hz|0}/s (${ticks} ticks)`;
		callback({ iterations, noops, count, time, ticks, hz, message });
	}

	next();
}


describe('performance', function() {
	let scratch;

	this.timeout(10000);

	before( () => {
		if (coverage) {
			console.warn('WARNING: Code coverage is enabled, which dramatically reduces performance. Do not pay attention to these numbers.');
		}
		scratch = document.createElement('div');
		(document.body || document.documentElement).appendChild(scratch);
	});

	beforeEach( () => {
		scratch.innerHTML = '';
	});

	after( () => {
		scratch.parentNode.removeChild(scratch);
		scratch = null;
	});

	it('should rerender without changes fast', done => {
		let jsx = (
			<div class="foo bar" data-foo="bar" p={2}>
				<header>
					<h1 class="asdf">a {'b'} c {0} d</h1>
					<nav>
						<a href="/foo">Foo</a>
						<a href="/bar">Bar</a>
					</nav>
				</header>
				<main>
					<form onSubmit={()=>{}}>
						<input type="checkbox" checked={true} />
						<input type="checkbox" checked={false} />
						<fieldset>
							<label><input type="radio" checked /></label>
							<label><input type="radio" /></label>
						</fieldset>
						<button-bar>
							<button style="width:10px; height:10px; border:1px solid #FFF;">Normal CSS</button>
							<button style="top:0 ; right: 20">Poor CSS</button>
							<button style="invalid-prop:1;padding:1px;font:12px/1.1 arial,sans-serif;" icon>Poorer CSS</button>
							<button style={{ margin:0, padding:'10px', overflow:'visible' }}>Object CSS</button>
						</button-bar>
					</form>
				</main>
			</div>
		);

		let root;
		benchmark( () => {
			root = render(jsx, scratch, root);
		}, ({ ticks, message }) => {
			console.log(`PERF: empty diff: ${message}`);
			expect(ticks).to.be.below(350 * MULTIPLIER);
			done();
		});
	});

	it('should rerender repeated trees fast', done => {
		class Header extends Component {
			render() {
				return (
					<header>
						<h1 class="asdf">a {'b'} c {0} d</h1>
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
					<form onSubmit={()=>{}}>
						<input type="checkbox" checked={true} />
						<input type="checkbox" checked={false} />
						<fieldset>
							<label><input type="radio" checked /></label>
							<label><input type="radio" /></label>
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
						<Button style="width:10px; height:10px; border:1px solid #FFF;">Normal CSS</Button>
						<Button style="top:0 ; right: 20">Poor CSS</Button>
						<Button style="invalid-prop:1;padding:1px;font:12px/1.1 arial,sans-serif;" icon>Poorer CSS</Button>
						<Button style={{ margin:0, padding:'10px', overflow:'visible' }}>Object CSS</Button>
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
			render({ child:C }) {
				return <C />;
			}
		}

		let root;
		benchmark( () => {
			root = render(<Parent child={Root} />, scratch, root);
			root = render(<Parent child={Empty} />, scratch, root);
		}, ({ ticks, message }) => {
			console.log(`PERF: repeat diff: ${message}`);
			expect(ticks).to.be.below(2000 * MULTIPLIER);
			done();
		});
	});

	it('should construct large VDOM trees fast', done => {
		const FIELDS = [];
		for (let i=100; i--; ) FIELDS.push((i*999).toString(36));

		let out = [];
		function digest(vnode) {
			out.push(vnode);
			out.length = 0;
		}
		benchmark( () => {
			digest(
				<div class="foo bar" data-foo="bar" p={2}>
					<header>
						<h1 class="asdf">a {'b'} c {0} d</h1>
						<nav>
							<a href="/foo">Foo</a>
							<a href="/bar">Bar</a>
						</nav>
					</header>
					<main>
						<form onSubmit={()=>{}}>
							<input type="checkbox" checked />
							<input type="checkbox" />
							<fieldset>
								{ FIELDS.map( field => (
									<label>
										{field}:
										<input placeholder={field} />
									</label>
								)) }
							</fieldset>
							<button-bar>
								<button style="width:10px; height:10px; border:1px solid #FFF;">Normal CSS</button>
								<button style="top:0 ; right: 20">Poor CSS</button>
								<button style="invalid-prop:1;padding:1px;font:12px/1.1 arial,sans-serif;" icon>Poorer CSS</button>
								<button style={{ margin:0, padding:'10px', overflow:'visible' }}>Object CSS</button>
							</button-bar>
						</form>
					</main>
				</div>
			);
		}, ({ ticks, message }) => {
			console.log(`PERF: large VTree: ${message}`);
			expect(ticks).to.be.below(2000 * MULTIPLIER);
			done();
		});
	});
});
