import ProgressBar from "@/components/progressbar";
import { corpus, filteredCorpus, filters } from "@/global_state";
import { filterCorpus, filterCorpusProgress } from "@/lib/processing";
import van from "vanjs-core";
import { navigate } from "vanjs-routing";

const { main, h1, p, div, h4, strong, span, input, button } = van.tags;

const Filters = () => {
  return main(
    h1("2. Set the Filters"),
    p(
      "Use the sliders to chose how many nodes of each type to included in your network based on the number of records in which they appears (it is recommended NOT to include references occurring in one record only)",
    ),
    Object.entries(filters.val).map(([field, filter]) => {
      const value = van.state(filter.value);
      van.derive(() => (filter.value = value.val));
      return div(
        h4(field),
        div(
          "Keep the ",
          strong(() => filter.counts[value.val]),
          span(` ${field} `),
          span(field !== "works" ? "occurring in at least " : "with at least "),
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
    ProgressBar(filterCorpusProgress),
    button({ onclick: () => navigate("/search") }, "1. Corpus"),
    button(
      {
        onclick: async () => {
          filteredCorpus.val = await filterCorpus(corpus.val, filters.val);
          navigate("/viz");
        },
      },
      "3. Graph",
    ),
  );
};

export default Filters;
