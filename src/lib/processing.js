import { fields } from './graph.js';

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
  let data = fields.reduce((acc, curr) => {acc[curr] = {}; return acc;}, {});

  works.forEach((work) => {
    work.referenced_works.forEach((ref) => {
      incOrCreate(data.refs, ref, 'count');
    });
    
    work.primary_location?.source &&
      incOrCreate(data.sources, work.primary_location.source.id, 'count');

    // Use Sets to count each country and institution mentionned ONLY ONCE per work
    let countries = new Set();
    let institutions = new Set();
    work.authorships.forEach((authorship) => {
      incOrCreate(data.authors, authorship.author.id, 'count');
      authorship.countries.forEach((country) => {
	countries.add(country);
      });
      authorship.institutions.forEach((institution) => {
	institutions.add(institution.id);
      });
    });
    countries.forEach((country) => {
      incOrCreate(data.countries, country, 'count');
    });
    institutions.forEach((institution) => { // This is only the id!
      incOrCreate(data.institutions, institution, 'count');
    });

    work.concepts.forEach((concept) => {
      incOrCreate(data.concepts, concept.id, 'count');
    });

    work.grants.forEach((grant) => {
      incOrCreate(data.funders, grant.funder, 'count');
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

export const filterData = (data, filters) => {
  let filteredData = {};
  fields.forEach((field) => {
    let threshold = filters[field].lowerBounds[filters[field].value];
    filteredData[field] = Object.fromEntries(Object.entries(data[field]).filter(([, {count}]) => count >= threshold));
  });
  return filteredData;
};
