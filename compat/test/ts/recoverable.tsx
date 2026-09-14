import React, { browser, use } from '../../';
export const value: undefined = use(browser());
export const reason: undefined = use(browser(() => new Error('browser only')));
export const fromDefault: undefined = React.use(React.browser('browser only'));
// @ts-expect-error A reason must be a string or an initializer.
browser(123);
