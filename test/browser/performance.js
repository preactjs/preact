import { h, render } from '../../src/preact';
/** @jsx h */

/*eslint no-console:0*/

describe('performance', () => {
	let scratch;

	before( () => {
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

	it('should rerender without changes fast', () => {
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

		function fullRender() {
			render(jsx, scratch, scratch.firstChild);
		}

		function noop() {}

		let now = typeof performance==='undefined' ? () => Date.now() : () => performance.now();

		function loop(iter) {
			let start = now(),
				count = 0;
			while ( now()-start < 250 ) {
				count++;
				iter();
			}
			return count;
		}

		fullRender();

		let noopCount = loop(noop);

		let renderCount = loop(fullRender);

		// adjust for simple loop speed:
		let per = noopCount / renderCount;

		console.log(`render(): ${(renderCount*4)|0}/s (${per|0} ticks)`);

		// expect(renderCount / noopCount).to.be.above(0.0001);
		expect(per).to.be.below(350);
	});

	it('should rerender repeated trees fast', () => {
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
		function fullRender() {
			root = render(<Parent child={Root} />, scratch, root);
			root = render(<Parent child={Empty} />, scratch, root);
		}

		// let test = {};
		function noop() {
			// test.width = String(scratch.firstChild.offsetWidth);
			// test.height = String(scratch.firstChild.offsetHeight);
			// test.left = String(scratch.firstChild.offsetLeft);
		}

		let now = typeof performance==='undefined' ? () => Date.now() : () => performance.now();

		function loop(iter) {
			let start = now(),
				count = 0;
			while ( now()-start < 250 ) {
				count++;
				iter();
			}
			return count;
		}

		fullRender();

		let noopCount = loop(noop);

		let renderCount = loop(fullRender);

		// adjust for simple loop speed:
		let per = noopCount / renderCount;

		console.log(`render(): ${(renderCount*4)|0}/s (${per|0} ticks)`);

		expect(per).to.be.below(2000);
	});
});
