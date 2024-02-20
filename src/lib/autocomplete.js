export const autoCompleteConceptConfig = {
  placeHolder: 'Search for Concepts...',
  data: {
    src: async (query) => {
      try {
	const response = await fetch(
          'https://api.openalex.org/autocomplete/concepts?' + new URLSearchParams({
	    q: query,
            mailto: `****@****.com`,
	  }));
	if (!response.ok) {
	  throw new Error('Network response was not OK');
	}
	const data = await response.json();
	return data.results;
      } catch (e) {
	console.error(`Error while fetching concepts to autocomplete:\n\t${e}`);
	return e;
      }
    },
    keys: ['display_name'],
    cache: false,
  },
  debounce: 300,
  resultItem: {
    tabSelect: true,
    noResults: true,
    highlight: true,
  },
  events: {
    input: {
      navigate: (event) => {
	const selection = event.detail.selection.value;
	event.target.value = selection.display_name;
      }
    }
  },
};
