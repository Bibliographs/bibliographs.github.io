import van from "vanjs-core";
import { navigate } from "vanjs-routing";
import { pageStyle } from "@/lib/utils";
import { fetchWorks, fetchWorksProgress } from "@/lib/fetch";
import { corpus, filters } from "@/global_state";
import { processWorks, getFilters } from "@/lib/processing";
import ProgressBar from "@/components/progressbar";

const { main, iframe, button, div, form, input, h1, p } = van.tags;

const urlRegex = /^https:\/\/api\.openalex\.org\/.*$/;
const isValidURL = (url) => {
  return urlRegex.test(url);
};
const cleanURL = (url) => {
  url = new URL(url);
  url.searchParams.delete("page");
  return url.toString();
};

const Search = () => {
  pageStyle(`
  input.url {
  width: 80%;
  }
  `);

  const url = van.state(localStorage.getItem("openalexUrl") || "");
  van.derive(() => localStorage.setItem("openalexUrl", url.val));

  return main(
    h1("1. Define your corpus"),
    p(
      "For large corpuses, only the 10.000 most cited records will be processed",
    ),
    iframe({
      id: "openalex-frame",
      width: "80%",
      height: "500px",
      allow: "clipboard-write",
      src: "https://openalex.org/?view=api,list,report",
      onmouseleave: async () => {
        const clip = await navigator.clipboard.readText();
        console.log("clip: ", clip, "\nis valid: ", isValidURL(clip));
        if (isValidURL(clip)) url.val = cleanURL(clip);
      },
      onmouseenter: () => document.activeElement.blur(),
    }),
    form(
      {
        onsubmit: (e) => {
          e.preventDefault();
        },
      },
      input({
        class: "url",
        type: "text",
        required: true,
        pattern: urlRegex.toString().slice(1, -1),
        placeholder: "Please copy the url from the OpenAlex interface...",
        value: url,
        oninput: (e) => (url.val = e.target.value),
      }),
      div(
        { id: "fetch-log" },
        "Click on 'Fetch Corpus' button to start downloading the corpus.",
      ),
      ProgressBar(fetchWorksProgress),
      input({
        type: "submit",
        value: "2. Filters",
        disabled: () => !isValidURL(url.val),
        onclick: async () => {
          const { works } = await fetchWorks(cleanURL(url.rawVal), 100);
          corpus.val = processWorks(works);
          filters.val = getFilters(corpus.val);
          navigate("/filters");
        },
      }),
    ),
    div(
      button(
        {
          onclick: () => navigate("/"),
        },
        "Back",
      ),
    ),
  );
};

export default Search;
