import { createElement } from "preact";
import { createComponent, watch, ref } from "preact/composition";
import { Link } from "preact-router";

import Form from "./form";
import DomEvents from "./domEvents";
import Theme from "./theme";
import Raf from "./raf";

import "./style.css";
import { ThemeCtx } from "./utils/ctx";
import { effect } from "../../composition/src";

export default createComponent(function() {
	const match = watch(props => {
		switch (props.demo) {
			case "form":
				return <Form />;
			case "domEvents":
				return <DomEvents />;
			case "theme":
				return <Theme />;
			case "raf":
				return <Raf />;
			default:
				return <div>Not found</div>;
		}
	});

	const theme = ref({
		style: { color: "black", background: "white" },
		invert
	});

	function invert() {
		const style =
			theme.value.style.color === "black"
				? { color: "white", background: "black" }
				: { color: "black", background: "white" };

		theme.value = { ...theme.value, style };
	}

	return () => {
		return (
			<ThemeCtx.Provider value={theme.value}>
				<nav className="composition-demo-list">
					<Link href="/composition/form">Form</Link>
					<Link href="/composition/domEvents">DomEvents</Link>
					<Link href="/composition/theme">Theme</Link>
					<Link href="/composition/raf">Raf</Link>
					<span style={theme.value.style} onClick={theme.value.invert}>
						Current theme: {theme.value.style.background}
					</span>
				</nav>
				{match.value}
			</ThemeCtx.Provider>
		);
	};
});
