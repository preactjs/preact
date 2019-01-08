import { createElement as h, render } from 'preact';
import { spy } from 'sinon';
import { setupScratch, teardown, setupRerender } from '../../../test/_util/helpers';
import { useEffectAssertions } from './useEffectAssertions';
import { useLayoutEffect } from '../../src';

/** @jsx h */

describe('useLayoutEffect', () => {

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

  // Layout effects fire synchronously
  const scheduleEffectAssert = assertFn => new Promise(resolve => {
    assertFn();
    resolve();
  });

  useEffectAssertions(useLayoutEffect, scheduleEffectAssert);


  it('calls the effect immediately after render', () => {
    const cleanupFunction = spy();
    const callback = spy(() => cleanupFunction);

    function Comp() {
      useLayoutEffect(callback);
      return null;
    }

    render(<Comp />, scratch);
    render(<Comp />, scratch);

    expect(cleanupFunction).to.be.calledOnce;
    expect(callback).to.be.calledTwice;

    render(<Comp />, scratch);

    expect(cleanupFunction).to.be.calledTwice;
    expect(callback).to.be.calledThrice;
  });

  it('works on a nested component', () => {
    const callback = spy();

    function Parent() {
      return (
        <div>
          <Child/>
        </div>
      )
    }

    function Child() {
      useLayoutEffect(callback);
      return null;
    }

    render(<Parent/>, scratch);

    expect(callback).to.be.calledOnce;
  });
});