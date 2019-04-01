import { computed, observable } from "mobx"
import { observer } from "mobx-react"
import { Component, h } from "preact"
import { RouteChildProps } from "./router"
import { store } from "./store"

export type ProfileProps = RouteChildProps
@observer
export class Profile extends Component<ProfileProps> {
  @observable id = ""
  @observable busy = false

  componentDidMount() {
    this.id = this.props.route
  }

  componentWillReceiveProps(props: ProfileProps) {
    this.id = props.route
  }

  render() {
    const user = this.user
    if (user == null) return null
    return (
      <div class="profile">
        <img class="avatar" src={user.picture.large} />
        <h2>
          {user.name.first} {user.name.last}
        </h2>
        <div class="details">
          <p>
            {user.gender === "female" ? "👩" : "👨"} {user.id}
          </p>
          <p>🖂 {user.email}</p>
        </div>
        <p>
          <button
            class={this.busy ? "secondary busy" : "secondary"}
            disabled={this.busy}
            onClick={this.remove}
          >
            Remove contact
          </button>
        </p>
      </div>
    )
  }

  @computed get user() {
    return store.users.find(u => u.id === this.id)
  }

  remove = async () => {
    this.busy = true
    await new Promise<void>(cb => setTimeout(cb, 1500))
    store.deleteUser(this.id)
    this.busy = false
  }
}
