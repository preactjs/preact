import {Component, createContext, render,h} from '../src'

const FontContent = createContext(10);
const WidthContent = createContext(20);

class Child extends Component {
    render() {
        return <WidthContent.Consumer>
            {width => {
                console.log(width)
                return <div>
                    {width}&emsp;
                    <FontContent.Consumer>{font => font}</FontContent.Consumer>
                </div>
            }}
        </WidthContent.Consumer>
    }
}

function Parent() {
    return <Child/>
}

render(<Parent/>, document.getElementById('app'));
