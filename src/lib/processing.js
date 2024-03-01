import { fields, metadataFields } from './graph.js';
import { fetchRefsLabels } from './fetch.js';

const incOrCreate = (obj, key, subkey=false) => {
  if (subkey) {
    obj[key] = (obj[key] || {});
    obj[key][subkey] = (obj[key][subkey] || 0) + 1;
  } else {
    obj[key] = (obj[key] || 0) + 1;
  }
};

export const processWorks = (works) => {
  // Empty objects for each fields
  const data = fields.reduce((acc, curr) => {acc[curr] = {}; return acc;}, {});
  data.sets = fields.reduce((acc, curr) => {acc[curr] = {}; return acc;}, {});

  works.forEach((work) => {
    // Create empty sets for each field
    for (const field of Object.keys(data.sets)) {
      data.sets[field][work.id] = new Set();
    }

    data.works[`work-${work.id}`] = {count: work.cited_by_count, label: work.title};
    data.sets.works[work.id].add(`work-${work.id}`);

    work.referenced_works.forEach((ref) => {
      incOrCreate(data.refs, ref, 'count');
    });
    data.sets.refs[work.id] = new Set(work.referenced_works);

    // TODO think about using all the associated sources
    if (work.primary_location?.source) {
      incOrCreate(data.sources, work.primary_location.source.id, 'count');
      data.sources[work.primary_location.source.id].label = work.primary_location.source.display_name;
      data.sets.sources[work.id].add(work.primary_location.source.id);
    }

    const institutions = {}; // Save institions objects to retrieve the labels later
    // Use Sets to count each country and institution mentionned ONLY ONCE per work
    work.authorships.forEach((authorship) => {
      incOrCreate(data.authors, authorship.author.id, 'count');
      data.authors[authorship.author.id].label = authorship.author.display_name;
      data.sets.authors[work.id].add(authorship.author.id);

      authorship.countries.forEach((country) => {
	data.sets.countries[work.id].add(country);
      });
      authorship.institutions.forEach((institution) => {
	data.sets.institutions[work.id].add(institution.id);
	institutions[institution.id] = institution;
      });
    });
    data.sets.countries[work.id].forEach((country) => {
      incOrCreate(data.countries, country, 'count');
      data.countries[country].label = country;
    });
    data.sets.institutions[work.id].forEach((institutionId) => { // This is only the id!
      incOrCreate(data.institutions, institutionId, 'count');
      data.institutions[institutionId].label = institutions[institutionId].display_name;
    });

    work.concepts.forEach((concept) => {
      incOrCreate(data.concepts, concept.id, 'count');
      data.concepts[concept.id].label = concept.display_name;
      data.sets.concepts[work.id].add(concept.id);
    });

    work.grants.forEach((grant) => {
      incOrCreate(data.funders, grant.funder, 'count');
      data.funders[grant.funder].label = grant.funder_display_name;
      data.sets.funders[work.id].add(grant.funder);
    });
  });

  return data;
};

export const getFilters = (data) => {
  // Empty objects for each fields
  let filters = fields.reduce((acc, curr) => {acc[curr] = {}; return acc;}, {});

  fields.forEach((field) => {
    let counts = {};
    let sortedCounts = [];
    
    Object.values(data[field]).forEach(({count}) => {
      incOrCreate(counts, count);
    });
    sortedCounts = Object.entries(counts).sort(([key1,], [key2,]) => +key2 - +key1);
    filters[field] = sortedCounts.reduce((acc, [numOcc, c]) => {
      if (acc.lowerBounds.length == 0) acc.lowerBounds.push(+numOcc + 1);
      acc.lowerBounds.push(+numOcc);
      acc.counts.push((acc.counts.at(-1) || 0) + c);
      return acc;
    }, {lowerBounds: [], counts: [0]});

    // Initialize the value of the filters
    let threshold = 0;
    switch (field) {
    case 'refs':
      threshold = 5000;
      break;
    case 'concepts':
      threshold = 200;
      break;
    case 'works':
    case 'authors':
    case 'institutions':
    case 'sources':
      threshold = 50;
      break;
    case 'countries':
    case 'funders':
      threshold = 25;
      break;
    }

    // Get the filter value closest to the threshold
    let idxAbove = filters[field].counts.findIndex((el) => el >= threshold);
    let idxBelow = filters[field].counts.findLastIndex((el) => el < threshold);
    let diffAbove = Math.abs(threshold - filters[field].counts[idxAbove]);
    let diffBelow = Math.abs(threshold - filters[field].counts[idxBelow]);
    filters[field].value = diffAbove < diffBelow ? idxAbove : idxBelow;

    if (field === 'refs') {
      // We want at least 2 occurences of refs by default
      filters[field].value = Math.min(filters[field].value, filters[field].counts.length - 2);
    }
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

export const filterData = async (data, filters) => {
  const filteredData = {};
  filteredData.sets = {};
  filteredData.maxCounts = {};

  console.time('filter');

  // Filter the refs first to get refsSet and use it to filter later
  const threshold = filters.refs.lowerBounds[filters.refs.value];
  const filteredRefs = Object.entries(data.refs)
	.filter(([, {count}]) => count >= threshold)
	.sort(([, {count: count1}], [, {count: count2}]) => count2 - count1); // Sort in reverse order, we want the top ones first
  filteredData.refs = Object.fromEntries(filteredRefs);
  const refsSet = new Set(Object.keys(filteredData.refs));
  filteredData.sets.refs = Object.fromEntries(Object.entries(data.sets.refs).map(([id, fieldSet]) => [id, intersection(refsSet, fieldSet)]).filter(([, fieldSet]) => fieldSet.size > 0));

  filteredData.maxCounts.refs = filteredRefs.reduce((acc, [, {count}]) => Math.max(acc, count), 0);

  // Create the refs labels
  console.time('label refs');
  const refsLabels = await fetchRefsLabels(filteredRefs.map(([id,]) => id), 50);
  for (const {id, title, authorships, publication_year} of refsLabels) {
    let label = authorships.slice(0, 3).map((authorship) => authorship.author.display_name).join(', ');
    if (authorships.length > 3) {
      label += ' et al.';
    }
    label += `, ${publication_year}`;
    filteredData.refs[id].label = label;
    filteredData.refs[id].title = title;
  }
  console.timeEnd('label refs');

  metadataFields.forEach((field) => {
    const threshold = filters[field].lowerBounds[filters[field].value];
    filteredData[field] = Object.fromEntries(Object.entries(data[field]).filter(([, {count}]) => count >= threshold));
    const wholeSet = new Set(Object.keys(filteredData[field]));
    filteredData.sets[field] = Object.fromEntries(Object.entries(data.sets[field]).map(([id, fieldSet]) => [id, intersection(wholeSet, fieldSet)]).filter(([id, fieldSet]) => fieldSet.size > 0 && filteredData.sets.refs[id]));

    filteredData.maxCounts[field] = Object.values(filteredData[field]).reduce((acc, {count}) => Math.max(acc, count), 0);
  });

  console.timeEnd('filter');

  return filteredData;
};

export const generateJSONDataURL = (data) => {
  const blob = new Blob([JSON.stringify(data, (_key, value) => (value instanceof Set ? [...value] : value), 2)], {
    type: 'application/json',
  });
  return URL.createObjectURL(blob);
}
