import { createElement as h, render } from 'preact';
import { spy } from 'sinon';
import { setupScratch, teardown, setupRerender } from '../../../test/_util/helpers';
import { useState } from '../../src';

/** @jsx h */


describe('useState', () => {

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


  it('serves the same state across render calls', () => {
    const stateHistory = [];

    function Comp() {
      const [state] = useState({ a: 1 });
      stateHistory.push(state);
      return null;
    }

    render(<Comp />, scratch);
    render(<Comp />, scratch);

    expect(stateHistory).to.deep.equal([{ a: 1 }, { a: 1 }]);
    expect(stateHistory[0]).to.equal(stateHistory[1]);
  });

  it('can initialize the state via a function', () => {
    const initState = spy(() => { a: 1 })

    function Comp() {
      useState(initState);
      return null;
    }

    render(<Comp />, scratch);
    render(<Comp />, scratch);

    expect(initState).to.be.calledOnce;
  });

  it('rerenders when setting the state', () => {
    let lastState;
    let doSetState;

    const Comp = spy(() => {
      const [state, setState] = useState(0);
      lastState = state;
      doSetState = setState;
      return null;
    });

    render(<Comp />, scratch);
    expect(lastState).to.equal(0);
    expect(Comp).to.be.calledOnce;

    doSetState(1);
    rerender();
    expect(lastState).to.equal(1);
    expect(Comp).to.be.calledTwice;

    // Updater function style
    doSetState(current => current * 10);
    rerender();
    expect(lastState).to.equal(10);
    expect(Comp).to.be.calledThrice;
  });

});