import { createElement, Component } from 'preact';
import p5 from "p5";

export default class P5 extends Component {
	y = 0;
	direction = 'top';

	componentDidMount() {
        this.scketch = new p5(ctx => {
            ctx.setup = () => {
				ctx.createCanvas(500, 500).parent(this.canvas_container)
			};

			ctx.draw = () => {
				ctx.background(0);
				ctx.fill(255, this.y * 1.3, 0);
				ctx.ellipse(ctx.width / 2, this.y, 50);
				if (this.y > ctx.height)
					this.direction = 'bottom';
				if (this.y < 0)
					this.direction = 'top';
				if (this.direction === 'top')
					this.y += 17;
				else
					this.y -= 8;
			};
		});
    }

	shouldComponentUpdate() {
        return false;
    }
    componentWillUnmount() {
        this.scketch.remove();
    }
    render() {
        return <div ref={ref => {this.canvas_container = ref}} />;
    }
}
