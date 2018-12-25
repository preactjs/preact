import { createElement as h, render } from 'preact';
import { spy } from 'sinon';
import { setupScratch, teardown, setupRerender } from '../../../test/_util/helpers';


/** @jsx h */

// Common behaviors between all effect hooks
export function useEffectAssertions(useEffect, scheduleEffectAssert) {

  /** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});


  it('performs the effect after every render by default', done => {
    const callback = spy();

    function Comp() {
			useEffect(callback);
			return null;
		}

    render(<Comp />, scratch);

    scheduleEffectAssert(() => expect(callback).to.be.calledOnce)
      .then(() => scheduleEffectAssert(() => expect(callback).to.be.calledOnce))
      .then(() => render(<Comp />, scratch))
      .then(() => scheduleEffectAssert(() => expect(callback).to.be.calledTwice))
      .then(done)
      .catch(done);
  });

  it('performs the effect only if one of the inputs changed', done => {
    const callback = spy();

    function Comp(props) {
      useEffect(callback, [props.a, props.b]);
      return null;
    }

    render(<Comp a={1} b={2} />, scratch);

    scheduleEffectAssert(() => expect(callback).to.be.calledOnce)
      .then(() => render(<Comp a={1} b={2} />, scratch))
      .then(() => scheduleEffectAssert(() => expect(callback).to.be.calledOnce))
      .then(() => render(<Comp a={2} b={2} />, scratch))
      .then(() => scheduleEffectAssert(() => expect(callback).to.be.calledTwice))
      .then(() => render(<Comp a={2} b={2} />, scratch))
      .then(() => scheduleEffectAssert(() => expect(callback).to.be.calledTwice))
      .then(done)
      .catch(done);
  });

  it('performs the effect at mount time and never again if an empty input Array is passed', done => {
    const callback = spy();

    function Comp() {
      useEffect(callback, []);
      return null;
    }

    render(<Comp />, scratch);
    render(<Comp />, scratch);

    expect(callback).to.be.calledOnce;

    scheduleEffectAssert(() => expect(callback).to.be.calledOnce)
      .then(() => render(<Comp />, scratch))
      .then(() => scheduleEffectAssert(() => expect(callback).to.be.calledOnce))
      .then(done)
      .catch(done);
  });

  it('calls the cleanup function followed by the effect after each render', done => {
    const cleanupFunction = spy();
    const callback = spy(() => cleanupFunction);

    function Comp() {
			useEffect(callback);
			return null;
		}

    render(<Comp />, scratch);

    scheduleEffectAssert(() => {
      expect(cleanupFunction).to.be.not.called;
      expect(callback).to.be.calledOnce;
    })
    .then(() => scheduleEffectAssert(() => expect(callback).to.be.calledOnce))
    .then(() => render(<Comp />, scratch))
    .then(() => scheduleEffectAssert(() => {
      expect(cleanupFunction).to.be.calledOnce;
      expect(callback).to.be.calledTwice;
      expect(callback.lastCall.calledAfter(cleanupFunction.lastCall));
    }))
    .then(done)
    .catch(done);
  });

  it('cleanups the effect when the component get unmounted if the effect was called before', done => {
    const cleanupFunction = spy();
    const callback = spy(() => cleanupFunction);

    function Comp() {
			useEffect(callback);
			return null;
		}

    render(<Comp />, scratch);

    scheduleEffectAssert(() => {
      render(null, scratch);
      rerender();
      expect(cleanupFunction).to.be.calledOnce;
    })
    .then(done)
    .catch(done);
  });

  it('works with closure effect callbacks capturing props', done => {
    const values = [];

    function Comp(props) {
      useEffect(() => values.push(props.value));
      return null;
    }

    render(<Comp value={1} />, scratch);
    render(<Comp value={2} />, scratch);

    scheduleEffectAssert(() => expect(values).to.deep.equal([1, 2]))
      .then(done)
      .catch(done);
  });
}