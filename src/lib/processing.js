import { fields, metadataFields } from './graph.js';

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

    work.referenced_works.forEach((ref) => {
      incOrCreate(data.refs, ref, 'count');
    });
    data.sets.refs[work.id] = new Set(work.referenced_works);
    
    if (work.primary_location?.source) {
      incOrCreate(data.sources, work.primary_location.source.id, 'count');
      data.sets.sources[work.id].add(work.primary_location.source.id);
    }

    // Use Sets to count each country and institution mentionned ONLY ONCE per work
    work.authorships.forEach((authorship) => {
      incOrCreate(data.authors, authorship.author.id, 'count');
      data.sets.authors[work.id].add(authorship.author.id);

      authorship.countries.forEach((country) => {
	data.sets.countries[work.id].add(country);
      });
      authorship.institutions.forEach((institution) => {
	data.sets.institutions[work.id].add(institution.id);
      });
    });
    data.sets.countries[work.id].forEach((country) => {
      incOrCreate(data.countries, country, 'count');
    });
    data.sets.institutions[work.id].forEach((institution) => { // This is only the id!
      incOrCreate(data.institutions, institution, 'count');
    });

    work.concepts.forEach((concept) => {
      incOrCreate(data.concepts, concept.id, 'count');
      data.sets.concepts[work.id].add(concept.id);
    });

    work.grants.forEach((grant) => {
      incOrCreate(data.funders, grant.funder, 'count');
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

    // Initialize de value of the filters
    filters[field].value = field == 'refs' ? filters[field].counts.length - 2 : 0;
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

export const filterData = (data, filters) => {
  const filteredData = {};
  filteredData.sets = {};

  console.time('filter');

  // Filter the refs first to get refsSet and use it to filter later
  const threshold = filters.refs.lowerBounds[filters.refs.value];
  filteredData.refs = Object.fromEntries(Object.entries(data.refs).filter(([, {count}]) => count >= threshold));
  const refsSet = new Set(Object.keys(filteredData.refs));
  filteredData.sets.refs = Object.fromEntries(Object.entries(data.sets.refs).map(([id, fieldSet]) => [id, intersection(refsSet, fieldSet)]).filter(([, fieldSet]) => fieldSet.size > 0));

  metadataFields.forEach((field) => {
    const threshold = filters[field].lowerBounds[filters[field].value];
    filteredData[field] = Object.fromEntries(Object.entries(data[field]).filter(([, {count}]) => count >= threshold));
    const wholeSet = new Set(Object.keys(filteredData[field]));
    filteredData.sets[field] = Object.fromEntries(Object.entries(data.sets[field]).map(([id, fieldSet]) => [id, intersection(wholeSet, fieldSet)]).filter(([id, fieldSet]) => fieldSet.size > 0 && refsSet.has(id)));
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
