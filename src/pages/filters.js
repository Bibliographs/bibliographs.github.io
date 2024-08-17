import { corpus, filteredCorpus, filters } from "@/global_state";
import { filterCorpus } from "@/lib/processing";
import { pageStyle } from "@/lib/utils";
import van from "vanjs-core";
import { navigate } from "vanjs-routing";

const { main, h1, p, div, h4, strong, span, input, button } = van.tags;

const Filters = () => {
  pageStyle(`
  .fields {
    flex-wrap: wrap;
    margin-top: 2em;
    justify-content: space-around;
  }
  .fields span {
    margin: 0;
  }
  .fields > div:first-child {
    margin: .5em 0;
  }
  .fields > div {
    width: calc(50% - 5em);
  }
  .fields input[type="range"] {
    width: 100%;
  }
  `);
  return main(
    { class: "c" },
    h1({ class: "center" }, "2. Set the Filters"),
    p(
      "Use the sliders to chose how many nodes of each type to included in your network based on the number of records in which they appears (it is recommended NOT to include references occurring in one record only)",
    ),
    div(
      { class: "fields flex-h" },
      Object.entries(filters.val).map(([field, filter]) => {
        const value = van.state(filter.value);
        van.derive(() => (filter.value = value.val));
        return div(
          div(
            "Keep the ",
            strong(() => filter.counts[value.val]),
            h4({ style: "display: inline" }, ` ${field} `),
            span(
              field !== "works" ? "occurring in at least " : "with at least ",
            ),
            strong(() => filter.lowerBounds[value.val]),
            span(field !== "works" ? " records" : " citations"),
          ),
          div(
            span({ style: "float: left" }, 0),
            span({ style: "float: right" }, filter.counts.at(-1)),
          ),
          input({
            type: "range",
            min: 0,
            max: filter.counts.length - 1,
            value: value,
            oninput: (e) => (value.val = e.target.value),
          }),
        );
      }),
    ),
    // ProgressBar(filterCorpusProgress),
    div(
      {
        style:
          "display: flex;justify-content: space-evenly;width: 50%;margin: auto;",
      },
      button(
        { class: "btn", onclick: () => navigate("/search") },
        " ⬅︎ 1. Corpus",
      ),
      button(
        {
          class: "btn primary",
          onclick: async () => {
            filteredCorpus.val = await filterCorpus(corpus.val, filters.val);
            navigate("/viz");
          },
        },
        "3. Graph ⮕ ",
      ),
    ),
  );
};

export default Filters;
