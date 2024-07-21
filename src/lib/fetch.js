import van from "vanjs-core";
import { timer } from "@/lib/utils";

const PER_PAGE = 200;

export const fetchWorksProgress = van.state(0);
export const fetchWorksLog = van.state("");

export const fetchWorks = async (url, maxWorks = 10000) => {
  const count = await fetchWorksCount(url);
  const numReq = Math.ceil(Math.min(count, maxWorks) / PER_PAGE);
  let numReqDone = 0;

  url = new URL(url);
  url.searchParams.set("sort", "cited_by_count:desc");
  url.searchParams.set(
    "select",
    "id,title,publication_year,primary_location,authorships,concepts,locations,grants,referenced_works,cited_by_count",
  );
  url.searchParams.set("mailto", "****@****.com");
  url.searchParams.set("per-page", PER_PAGE);

  let works = await Promise.all(
    [...Array(numReq).keys()].map(async (i) => {
      let data = {};
      try {
        url.searchParams.set("page", i + 1);
        let response = await fetch(url);
        if (response.status == 429) {
          for (let j = 1; j <= 3 && !response.ok; j++) {
            await timer(j * 100);
            response = await fetch(url);
          }
        }
        if (!response.ok) {
          throw new Error(
            `Network response was ${response.status} ${response.statusText}`,
          );
        }
        data = await response.json();
        numReqDone++;
        fetchWorksProgress.val = Math.round((numReqDone / numReq) * 100);
      } catch (e) {
        console.error(`Error while fetching works:\n\t${e}`);
      }
      return data.results;
    }),
  );

  works = works
    .flat()
    .slice(0, maxWorks)
    .filter((work) => work);

  return { count, works };
};

export const fetchWorksCount = async (url) => {
  let count = 0;
  url = new URL(url);
  url.searchParams.set("select", "id");
  url.searchParams.set("mailto", "****@****.com");
  url.searchParams.set("per-page", 1);
  url.searchParams.set("page", 1);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Network response was ${response.status} ${response.statusText}`,
      );
    }
    const data = await response.json();
    count = data.meta.count;
  } catch (e) {
    console.error(`Error while fetching works count:\n\t${e}`);
  }
  return count;
};

export const fetchRefsLabels = async (openalexIds, maxRefs = 500) => {
  // We'll only fetch the labels for the first maxRefs refs
  if (openalexIds.length === 0) return [];

  const refsPerPage = 50;
  const ids = [...openalexIds.slice(0, maxRefs)]; // Copy the array to prevent its destruction
  const numReq = Math.ceil(ids.length / refsPerPage);

  let refs = await Promise.all(
    [...Array(numReq).keys()].map(async (i) => {
      let data = {};
      const idsStr = ids.splice(0, refsPerPage).join("|");

      try {
        const response = await fetch(
          "https://api.openalex.org/works?" +
            new URLSearchParams({
              filter: `openalex:${idsStr}`,
              select: "id,title,authorships,publication_year",
              mailto: `****@****.com`,
              "per-page": PER_PAGE,
              page: 1,
            }),
        );
        if (!response.ok) {
          throw new Error("Network response was not OK");
        }
        data = await response.json();
      } catch (e) {
        console.error(`Error while fetching refs:\n\t${e}`);
      }
      return data.results;
    }),
  );

  return refs.flat().filter((ref) => ref);
};
