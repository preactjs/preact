import { Component, toChildArray } from "preact";

let updateRouter;

export class Router extends Component {
	constructor() {
		super();
		updateRouter = () => this.setState({});
	}

	render() {
		const children = toChildArray(this.props.children);
		const url = window.location.pathname || this.props.url;

		for (let i = 0; i < children.length; i++) {
			if (children[i].props.path === url) return children[i];
		}

		return <div>404 - No route matched.</div>;
	}
}

export class Link extends Component {
	constructor() {
		super();
		this.onClick = this.onClick.bind(this);
	}

	onClick(e) {
		if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button!==0) return;
		history.pushState(null, null, this.props.href);
		updateRouter();
		e.preventDefault();
	}

	render() {
		this.props.class = this.props.activeClassName;
		return (
			<a
				href={this.props.href}
				onClick={this.onClick}
				{...this.props}
			>
				{this.props.children}
			</a>
		);
	}
}
