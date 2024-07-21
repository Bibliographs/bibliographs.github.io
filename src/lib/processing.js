import van from "vanjs-core";
import { fields, metadataFields } from "./graph.js";
import { fetchRefsLabels } from "./fetch.js";

const incOrCreate = (obj, key, subkey = false) => {
  if (subkey) {
    obj[key] = obj[key] || {};
    obj[key][subkey] = (obj[key][subkey] || 0) + 1;
  } else {
    obj[key] = (obj[key] || 0) + 1;
  }
};

export const processWorksProgress = van.state(0);

export const processWorks = (works) => {
  // Empty objects for each fields
  const corpus = fields.reduce((acc, curr) => {
    acc[curr] = {};
    return acc;
  }, {});
  corpus.sets = fields.reduce((acc, curr) => {
    acc[curr] = {};
    return acc;
  }, {});

  const numWorks = works.length;
  works.forEach((work, idx) => {
    // Create empty sets for each field
    for (const field of Object.keys(corpus.sets)) {
      corpus.sets[field][work.id] = new Set();
    }

    let label = work.authorships
      .slice(0, 3)
      .map((authorship) => authorship.author.display_name)
      .join(", ");
    if (work.authorships.length > 3) {
      label += " et al.";
    }
    label += `, ${work.publication_year}`;
    corpus.works[`work-${work.id}`] = {
      count: work.cited_by_count,
      title: work.title,
      label,
    };
    corpus.sets.works[work.id].add(`work-${work.id}`);

    work.referenced_works.forEach((ref) => {
      incOrCreate(corpus.refs, ref, "count");
    });
    corpus.sets.refs[work.id] = new Set(work.referenced_works);

    // TODO think about using all the associated sources
    if (work.primary_location?.source) {
      incOrCreate(corpus.sources, work.primary_location.source.id, "count");
      corpus.sources[work.primary_location.source.id].label =
        work.primary_location.source.display_name;
      corpus.sets.sources[work.id].add(work.primary_location.source.id);
    }

    const institutions = {}; // Save institions objects to retrieve the labels later
    // Use Sets to count each country and institution mentionned ONLY ONCE per work
    work.authorships.forEach((authorship) => {
      incOrCreate(corpus.authors, authorship.author.id, "count");
      corpus.authors[authorship.author.id].label =
        authorship.author.display_name;
      corpus.sets.authors[work.id].add(authorship.author.id);

      authorship.countries.forEach((country) => {
        corpus.sets.countries[work.id].add(country);
      });
      authorship.institutions.forEach((institution) => {
        corpus.sets.institutions[work.id].add(institution.id);
        institutions[institution.id] = institution;
      });
    });
    corpus.sets.countries[work.id].forEach((country) => {
      incOrCreate(corpus.countries, country, "count");
      corpus.countries[country].label = country;
    });
    corpus.sets.institutions[work.id].forEach((institutionId) => {
      // This is only the id!
      incOrCreate(corpus.institutions, institutionId, "count");
      corpus.institutions[institutionId].label =
        institutions[institutionId].display_name;
    });

    work.concepts.forEach((concept) => {
      incOrCreate(corpus.concepts, concept.id, "count");
      corpus.concepts[concept.id].label = concept.display_name;
      corpus.sets.concepts[work.id].add(concept.id);
    });

    work.grants.forEach((grant) => {
      incOrCreate(corpus.funders, grant.funder, "count");
      corpus.funders[grant.funder].label = grant.funder_display_name;
      corpus.sets.funders[work.id].add(grant.funder);
    });

    processWorksProgress.val = Math.round(((idx + 1) / numWorks) * 100);
  });

  return corpus;
};

export const getFiltersProgress = van.state(0);

export const getFilters = (data) => {
  // Empty objects for each fields
  let filters = fields.reduce((acc, curr) => {
    acc[curr] = {};
    return acc;
  }, {});

  const numFields = fields.length;
  fields.forEach((field, idx) => {
    let counts = {};
    let sortedCounts = [];

    Object.values(data[field]).forEach(({ count }) => {
      incOrCreate(counts, count);
    });
    sortedCounts = Object.entries(counts).sort(
      ([key1], [key2]) => +key2 - +key1,
    );
    filters[field] = sortedCounts.reduce(
      (acc, [numOcc, c]) => {
        if (acc.lowerBounds.length == 0) acc.lowerBounds.push(+numOcc + 1);
        acc.lowerBounds.push(+numOcc);
        acc.counts.push((acc.counts.at(-1) || 0) + c);
        return acc;
      },
      { lowerBounds: [], counts: [0] },
    );

    // Initialize the value of the filters
    let threshold = 0;
    switch (field) {
      case "refs":
        threshold = 5000;
        break;
      case "concepts":
        threshold = 200;
        break;
      case "works":
      case "authors":
      case "institutions":
      case "sources":
        threshold = 50;
        break;
      case "countries":
      case "funders":
        threshold = 25;
        break;
    }

    // Get the filter value closest to the threshold
    let idxAbove = filters[field].counts.findIndex((el) => el >= threshold);
    let idxBelow = filters[field].counts.findLastIndex((el) => el < threshold);
    let diffAbove = Math.abs(threshold - filters[field].counts[idxAbove]);
    let diffBelow = Math.abs(threshold - filters[field].counts[idxBelow]);
    filters[field].value = diffAbove < diffBelow ? idxAbove : idxBelow;

    if (field === "refs") {
      // We want at least 2 occurences of refs by default
      filters[field].value = Math.min(
        filters[field].value,
        filters[field].counts.length - 2,
      );
    }

    getFiltersProgress.val = Math.round(((idx + 1) / numFields) * 100);
  });

  return filters;
};

function intersection(setA, setB) {
  const _intersection = new Set();
  for (const elem of setB) {
    if (setA.has(elem)) {
      _intersection.add(elem);
    }
  }
  return _intersection;
}

export const filterCorpusProgress = van.state(0);

export const filterCorpus = async (corpus, filters) => {
  const filteredCorpus = {};
  filteredCorpus.sets = {};
  filteredCorpus.maxCounts = {};

  console.time("filter");

  // Filter the refs first to get refsSet and use it to filter later
  const threshold = filters.refs.lowerBounds[filters.refs.value];
  const filteredRefs = Object.entries(corpus.refs)
    .filter(([, { count }]) => count >= threshold)
    .sort(([, { count: count1 }], [, { count: count2 }]) => count2 - count1); // Sort in reverse order, we want the top ones first
  filteredCorpus.refs = Object.fromEntries(filteredRefs);
  filterCorpusProgress.val += 10;
  const refsSet = new Set(Object.keys(filteredCorpus.refs));
  filteredCorpus.sets.refs = Object.fromEntries(
    Object.entries(corpus.sets.refs)
      .map(([id, fieldSet]) => [id, intersection(refsSet, fieldSet)])
      .filter(([, fieldSet]) => fieldSet.size > 0),
  );

  filteredCorpus.maxCounts.refs = filteredRefs.reduce(
    (acc, [, { count }]) => Math.max(acc, count),
    0,
  );

  filterCorpusProgress.val += 10;

  // Create the refs labels
  console.time("label refs");
  const refsLabels = await fetchRefsLabels(
    filteredRefs.map(([id]) => id),
    50,
  );
  filterCorpusProgress.val += 70;
  for (const { id, title, authorships, publication_year } of refsLabels) {
    let label = authorships
      .slice(0, 3)
      .map((authorship) => authorship.author.display_name)
      .join(", ");
    if (authorships.length > 3) {
      label += " et al.";
    }
    label += `, ${publication_year}`;
    filteredCorpus.refs[id].label = label;
    filteredCorpus.refs[id].title = title;
  }
  console.timeEnd("label refs");

  metadataFields.forEach((field) => {
    const threshold = filters[field].lowerBounds[filters[field].value];
    filteredCorpus[field] = Object.fromEntries(
      Object.entries(corpus[field]).filter(
        ([, { count }]) => count >= threshold,
      ),
    );
    const wholeSet = new Set(Object.keys(filteredCorpus[field]));
    filteredCorpus.sets[field] = Object.fromEntries(
      Object.entries(corpus.sets[field])
        .map(([id, fieldSet]) => [id, intersection(wholeSet, fieldSet)])
        .filter(
          ([id, fieldSet]) => fieldSet.size > 0 && filteredCorpus.sets.refs[id],
        ),
    );

    filteredCorpus.maxCounts[field] = Object.values(
      filteredCorpus[field],
    ).reduce((acc, { count }) => Math.max(acc, count), 0);
  });

  console.timeEnd("filter");
  filterCorpusProgress.val += 10;

  return filteredCorpus;
};

export const generateJSONDataURL = (data) => {
  const blob = new Blob(
    [
      JSON.stringify(
        data,
        (_key, value) => (value instanceof Set ? [...value] : value),
        2,
      ),
    ],
    {
      type: "application/json",
    },
  );
  return URL.createObjectURL(blob);
};
