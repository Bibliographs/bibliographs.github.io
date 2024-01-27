window.perPage = 200;

const toQueryParams = (params) => {
  const queryParams = {};

  for (const param of params) {
    if (param.type === 'date') {
      queryParams.fromYear = param.fromYear;
      queryParams.toYear = param.toYear;
    } else {
      queryParams[param.type] = param.value;
    }
  }

  return queryParams;
};

export const fetchWorks = async (params, maxWorks) => {
  const qp = toQueryParams(params);
  let works = [];
  let count = 0;
  
  if (qp.title || qp.titleabs ||
      qp.titleabsfull || qp.concept) {
    const filters = [];
    const numReq = Math.ceil(maxWorks / perPage);

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

    if (qp.concept) {
      filters.push(`concepts.id:${qp.concept}`);
    }

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
	  }));
	if (!response.ok) {
	  throw new Error("Network response was not OK");
	}
	data = await response.json();
	count = data.meta.count;
      } catch (e) {
	console.error(`Error while fetching works:\n\t${e}`);
      }
      return data.results;
    }));

    works = works.flat().slice(0, maxWorks).filter(work => work);
  }
  
  return {count, works};
};

export const fetchRefsLabels = async (openalexIds) => {
  if (openalexIds.length === 0) return [];

  const refsPerPage = 50;
  const maxRefs = 500; // We'll only fetch the labels for the first maxRefs refs
  const ids = [...openalexIds.slice(0, maxRefs)]; // Copy the array to prevent its destruction
  const numReq = Math.ceil(ids.length / refsPerPage);

  let refs = await Promise.all([...Array(numReq).keys()].map(async (i) => {
    let data = {};
    const idsStr = ids.splice(0, refsPerPage).join("|");

    try {
      const response = await fetch(
        "https://api.openalex.org/works?" + new URLSearchParams({
	  filter: `openalex:${idsStr}`,
	  select: "id,display_name",
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
