import ReactTransitionEvents from '../../../../compat/lib/ReactTransitionEvents';

describe('ReactTransitionEvents', () => {
	it('should export add and remove functions', () => {
		expect(ReactTransitionEvents).to.have.property('addEndEventListener').that.is.a('function');
		expect(ReactTransitionEvents).to.have.property('removeEndEventListener').that.is.a('function');
	});

	it('should support transition events', done => {
		let div = document.createElement('div');
		div.style.cssText = 'position:absolute; left:0; top:0; width:100px; height:100px; background:#000; transition:all 50ms ease;';
		document.body.appendChild(div);

		setTimeout(() => {
			let onEnd = sinon.spy();
			ReactTransitionEvents.addEndEventListener(div, onEnd);
			div.style.left = '100px';

			setTimeout(() => {
				expect(onEnd).to.have.been.calledOnce;

				document.body.removeChild(div);
				done();
			}, 100);
		});
	});

	it('should support animation events', done => {
		let div = document.createElement('div');
		div.style.cssText = 'position:absolute; left:0; top:0; width:100px; height:100px; background:#000;';
		div.innerHTML = `
			<style type="text/css">
				@keyframes slide {
					0% { left:-100px; }
					100% { left:100px; }
				}
				@-webkit-keyframes slide {
					0% { left:-100px; }
					100% { left:100px; }
				}
				.slide {
					animation: slide 50ms forwards 1 ease;
					-webkit-animation: slide 50ms forwards 1 ease;
				}
			</style>
		`;
		document.body.appendChild(div);

		setTimeout(() => {
			let onEnd = sinon.spy();
			ReactTransitionEvents.addEndEventListener(div, onEnd);
			div.className = 'slide';

			setTimeout(() => {
				expect(onEnd).to.have.been.calledOnce;

				document.body.removeChild(div);
				done();
			}, 100);
		});
	});
});
