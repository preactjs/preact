import {render, toChildArray, createRef, cloneElement, h, Component} from '../src'

class Root extends Component{
    $ref=createRef();
    componentDidMount(){
        console.log(this.$ref)
    }
    render(){
        console.log(<div>1</div>)
        console.log(<div><span>2</span>1</div>)


        return <div ref={this.$ref}>

        </div>
    }
}

render(<Root />,document.getElementById('app'));
