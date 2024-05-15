import React from '../../src';

React.render(<div />, document.createElement('div'));
React.render(<div />, document.createDocumentFragment());
React.render(<div />, document.body.shadowRoot!);

React.hydrate(<div />, document.createElement('div'));
React.hydrate(<div />, document.createDocumentFragment());
React.hydrate(<div />, document.body.shadowRoot!);

React.unmountComponentAtNode(document.createElement('div'));
React.unmountComponentAtNode(document.createDocumentFragment());
React.unmountComponentAtNode(document.body.shadowRoot!);

React.createPortal(<div />, document.createElement('div'));
React.createPortal(<div />, document.createDocumentFragment());
React.createPortal(<div />, document.body.shadowRoot!);
