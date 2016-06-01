import { h, render } from '../../src/preact';
/** @jsx h */

/*global coverage*/
/*eslint no-console:0*/

const MULTIPLIER = coverage ? 5 : 1;


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
	let a = 0;
	function noop() {
		try { } finally { a += Math.random(); }
	}

	// warm
	for (let i=3; i--; ) noop(), iter();

	let count = 5,
		time = 100,
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


describe('performance', () => {
	let scratch;

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
			console.log(`empty diff render(): ${message}`);
			expect(ticks).to.be.below(350 * MULTIPLIER);
			done();
		});
	});

	it('should rerender repeated trees fast', done => {
		class Header {
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
		class Form {
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
		class ButtonBar {
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
		class Button {
			render(props) {
				return <button {...props} />;
			}
		}
		class Main {
			render() {
				return <Form />;
			}
		}
		class Root {
			render() {
				return (
					<div class="foo bar" data-foo="bar" p={2}>
						<Header />
						<Main />
					</div>
				);
			}
		}
		class Empty {
			render() {
				return <div />;
			}
		}
		class Parent {
			render({ child:C }) {
				return <C />;
			}
		}

		let root;
		benchmark( () => {
			root = render(<Parent child={Root} />, scratch, root);
			root = render(<Parent child={Empty} />, scratch, root);
		}, ({ ticks, message }) => {
			console.log(`repeated diff render(): ${message}`);
			expect(ticks).to.be.below(2000 * MULTIPLIER);
			done();
		});
	});
});
