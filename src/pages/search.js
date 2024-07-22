import van from "vanjs-core";
import { navigate } from "vanjs-routing";
import { fetchWorks, fetchWorksProgress } from "@/lib/fetch";
import { corpus, filters } from "@/global_state";
import { processWorks, getFilters } from "@/lib/processing";
import ProgressBar from "@/components/progressbar";
import { pageStyle } from "@/lib/utils";

const { main, iframe, div, form, input, label, h1, p } = van.tags;

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
  pageStyle(``);

  const url = van.state(localStorage.getItem("openalexUrl") || "");
  van.derive(() => localStorage.setItem("openalexUrl", url.val));

  const showProgress = van.state(false);
  const FetchWorksProgressBar = ProgressBar(
    fetchWorksProgress,
    "Downloading... ",
  );

  return main(
    { class: "c" },
    h1({ class: "center" }, "1. Define your corpus"),
    p(
      { style: "font-size: 0.85em" },
      "Use the frame below to search the OpenAlex database and carve out your corpus. Make sure your search retrieves only the publications relevant for your research - for large corpuses, only the 10.000 most cited records will be processed",
    ),
    iframe({
      id: "openalex-frame",
      width: "100%",
      height: "450px",
      style: "border-radius: 15px",
      allow: "clipboard-write",
      src: () =>
        url.val
          ? url.val.replace("//api.", "//") + "&view=api,list,report"
          : "https://openalex.org/?view=api,list,report",
      onmouseleave: async () => {
        const clip = await navigator.clipboard.readText();
        console.log("clip: ", clip, "\nis valid: ", isValidURL(clip));
        if (isValidURL(clip)) url.val = cleanURL(clip);
      },
      onmouseenter: () => document.activeElement.blur(),
    }),
    form(
      {
        style: "margin-top: 0",
        onsubmit: (e) => {
          e.preventDefault();
        },
      },
      div(
        { style: () => (showProgress.val ? "" : "visibility: hidden") },
        FetchWorksProgressBar,
      ),
      label(
        { for: "url", style: "font-size: 0.9em" },
        'Please copy the address provided above in the "API Box" and paste it below:',
      ),
      div(
        { style: "display: flex; justify-content: space-between;" },
        input({
          class: "card",
          style: "width: 80%",
          type: "text",
          required: true,
          pattern: urlRegex.toString().slice(1, -1),
          placeholder: "Please copy the url from the OpenAlex interface...",
          value: url,
          oninput: (e) => (url.val = e.target.value),
        }),
        input({
          class: "btn primary",
          type: "submit",
          value: "2. Filters =>",
          disabled: () => !isValidURL(url.val),
          onclick: async () => {
            showProgress.val = true;
            const { works } = await fetchWorks(cleanURL(url.rawVal), 100);
            corpus.val = processWorks(works);
            filters.val = getFilters(corpus.val);
            navigate("/filters");
          },
        }),
      ),
    ),
  );
};

export default Search;
