window.maxFetch = 5;
window.perPage = 200;

window.fetchWorks = async (query, fromYear, toYear) => {
  let works = [];
  let count = 0;
  
  if (query !== "") {
    const filters = [];

    filters.push(`from_publication_date:${fromYear}-01-01`);
    filters.push(`to_publication_date:${toYear}-12-31`);
    filters.push(`default.search:${query}`);

    works = await Promise.all([...Array(maxFetch).keys()].map(async (i) => {
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
    works = works.flat();
  }
  
  return {count, works};
};
