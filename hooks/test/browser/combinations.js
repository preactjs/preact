import { createElement as h, render } from 'preact';
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


  it('can mix useState hooks', () => {
    const states = {};
    const setStates = {};

    function Parent() {
      const [state1, setState1] = useState(1);
      const [state2, setState2] = useState(2);

      Object.assign(states, { state1, state2 });
      Object.assign(setStates, { setState1, setState2 });

      return <Child />;
    }

    function Child() {
      const [state3, setState3] = useState(3);
      const [state4, setState4] = useState(4);

      Object.assign(states, { state3, state4 });
      Object.assign(setStates, { setState3, setState4 });

      return null;
    }

    render(<Parent />, scratch);
    expect(states).to.deep.equal({ state1: 1, state2: 2, state3: 3, state4: 4 });

    setStates.setState2(n => n * 10);
    setStates.setState3(n => n * 10);
    rerender();
    expect(states).to.deep.equal({ state1: 1, state2: 20, state3: 30, state4: 4 });
  });

});