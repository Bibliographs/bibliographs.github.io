import "./index.css";

import van from "vanjs-core";
import { Router } from "vanjs-routing";

import Start from "./pages/start";
import Search from "./pages/search";
import Filters from "./pages/filters";
import Viz from "./pages/viz";

function App() {
  return Router({
    basename: "bibliograph2",
    routes: [
      { path: "/", component: Start },
      { path: "/search", component: Search },
      { path: "/filters", component: Filters },
      { path: "/viz", component: Viz },
    ],
  });
}

if (!window.IS_PRODUCTION)
  new EventSource("/esbuild").addEventListener("change", () =>
    location.reload(),
  );

van.add(document.body, App());
