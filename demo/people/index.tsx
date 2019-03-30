import { observer } from "mobx-react"
import { Component, h } from "preact"
import { Profile } from "./profile"
import { Link, Route, Router } from "./router"
import { store } from "./store"

import "./styles/index.scss";

@observer
export default class App extends Component {
  componentDidMount() {
    store.loadUsers().catch(console.error)
  }

  render() {
    return (
      <Router>
        <div id="people-app">
          <nav>
            <div style={{ margin: 16, textAlign: "center" }}>
              Sort by{" "}
              <select
                value={store.usersOrder}
                onChange={(ev: any) => {
                  store.setUsersOrder(ev.target.value)
                }}
              >
                <option value="name">Name</option>
                <option value="id">ID</option>
              </select>
            </div>
            <ul>
              {store.getSortedUsers().map((user, i) => (
                <li
                  key={user.id}
                  style={{
                    animationDelay: `${i * 20}ms`,
                    top: `calc(var(--menu-item-height) * ${i})`,
                    transitionDelay: `${i * 20}ms`,
                  }}
                >
                  <Link href={`people/${user.id}`} active>
                    <img class="avatar" src={user.picture.large} />
                    {user.name.first} {user.name.last}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <section id="people-main">
            <Route match="people">
              <Route match="*" component={Profile} />
            </Route>
          </section>
        </div>
      </Router>
    )
  }
}
