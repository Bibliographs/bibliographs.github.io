window.perPage = 200;

const toQueryParams = (params) => {
  const queryParams = {};

  for (const param of params) {
    if (param.type === 'date') {
      queryParams.fromYear = param.fromYear;
      queryParams.toYear = param.toYear;
    } else if (param.type === 'concept') {
      const op = param.op === 'or' ? '|' : ' ';
      const conceptsIds = param.concepts.map((concept) => concept.id.substring(concept.id.lastIndexOf('/') + 1));
      queryParams.concepts = conceptsIds.join(op);
    } else {
      queryParams[param.type] = param.value;
    }
  }

  return queryParams;
};

const fetchWorksCount = async (filter) => {
  let count = 0;
  try {
    const response = await fetch(
      "https://api.openalex.org/works?" + new URLSearchParams({
	filter,
	select: "id",
        mailto: `****@****.com`,
        "per-page": 1,
	page: 1,
      }).toString());
    if (!response.ok) {
      throw new Error("Network response was not 200 OK");
    }
    const data = await response.json();
    count = data.meta.count;
  } catch (e) {
    console.error(`Error while fetching works count:\n\t${e}`);
  }
  return count;
};

export const fetchWorks = async (params, maxWorks) => {
  const qp = toQueryParams(params);
  let works = [];
  let count = 0;
  
  if (qp.title || qp.titleabs ||
      qp.titleabsfull || qp.concepts) {
    const filters = [];

    if (qp.fromYear) {
      filters.push(`from_publication_date:${qp.fromYear}-01-01`);
    }
    if (qp.toYear) {
      filters.push(`to_publication_date:${qp.toYear}-12-31`);
    }

    if (qp.title) {
      filters.push(`title.search:${qp.title}`);
    }
    if (qp.titleabs) {
      filters.push(`title_and_abstract.search:${qp.titleabs}`);
    }
    if (qp.titleabsfull) {
      filters.push(`default.search:${qp.titleabsfull}`);
    }

    if (qp.concepts) {
      filters.push(`concepts.id:${qp.concepts}`);
    }

    count = await fetchWorksCount(filters.join(","));
    const numReq = Math.ceil(Math.min(count, maxWorks) / perPage);

    works = await Promise.all([...Array(numReq).keys()].map(async (i) => {
      let data = {};
      try {
	const response = await fetch(
          "https://api.openalex.org/works?" + new URLSearchParams({
	    filter: filters.join(","),
	    sort: 'cited_by_count:desc',
	    select: "id,title,publication_year,primary_location,authorships,concepts,locations,grants,referenced_works,cited_by_count",
            mailto: `****@****.com`,
            "per-page": perPage,
	    page: i+1,
	  }).toString());
	if (!response.ok) {
	  throw new Error("Network response was not 200 OK");
	}
	data = await response.json();
      } catch (e) {
	console.error(`Error while fetching works:\n\t${e}`);
      }
      return data.results;
    }));

    works = works.flat().slice(0, maxWorks).filter(work => work);
  }
  
  return {count, works};
};

export const checkApiUrl = (url) => {
  return url.startsWith("https://api.openalex.org/works?");
};

export const fetchWorksFromUrl = async (url, maxWorks) => {
  let works = [];

  const urlObj = new URL(url);
  const filter = urlObj.searchParams.get("filter");

  const count = await fetchWorksCount(filter);
  const numReq = Math.ceil(Math.min(count, maxWorks) / perPage);

  works = await Promise.all([...Array(numReq).keys()].map(async (i) => {
    let data = {};
    try {
      const response = await fetch(
        "https://api.openalex.org/works?" + new URLSearchParams({
	  filter,
	  sort: 'cited_by_count:desc',
	  select: "id,title,publication_year,primary_location,authorships,concepts,locations,grants,referenced_works,cited_by_count",
          mailto: `****@****.com`,
          "per-page": perPage,
	  page: i+1,
	}).toString());
      if (!response.ok) {
	throw new Error("Network response was not 200 OK");
      }
      data = await response.json();
    } catch (e) {
      console.error(`Error while fetching works:\n\t${e}`);
    }
    return data.results;
  }));

  works = works.flat().slice(0, maxWorks).filter(work => work);
  return {count, works};
};

export const fetchRefsLabels = async (openalexIds, maxRefs = 500) => {
  // We'll only fetch the labels for the first maxRefs refs
  if (openalexIds.length === 0) return [];

  const refsPerPage = 50;
  const ids = [...openalexIds.slice(0, maxRefs)]; // Copy the array to prevent its destruction
  const numReq = Math.ceil(ids.length / refsPerPage);

  let refs = await Promise.all([...Array(numReq).keys()].map(async (i) => {
    let data = {};
    const idsStr = ids.splice(0, refsPerPage).join("|");

    try {
      const response = await fetch(
        "https://api.openalex.org/works?" + new URLSearchParams({
	  filter: `openalex:${idsStr}`,
	  select: "id,title,authorships,publication_year",
          mailto: `****@****.com`,
          "per-page": perPage,
	  page: 1,
	}));
      if (!response.ok) {
	throw new Error("Network response was not OK");
      }
      data = await response.json();
    } catch (e) {
      console.error(`Error while fetching refs:\n\t${e}`);
    }
    return data.results;
  }));

  return refs.flat().filter(ref => ref);
};
