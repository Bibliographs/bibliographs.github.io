import '@tarekraafat/autocomplete.js/dist/css/autoComplete.02.css';
import '@ajusa/lit/src/lit.css';
import './index.css';

import Alpine from 'alpinejs';
import autoComplete from '@tarekraafat/autocomplete.js';

import { autoCompleteConceptConfig, autoCompleteTopicConfig } from './lib/autocomplete.js';
import { fetchWorks } from './lib/fetch.js';
import { processWorks, getFilters, filterData, generateJSONDataURL } from './lib/processing.js';
import { generateGraph, generateGexfURL } from './lib/graph.js';

window.autoCompleteConceptConfig = autoCompleteConceptConfig;
window.autoCompleteTopicConfig = autoCompleteTopicConfig;
window.fetchWorks = fetchWorks;
window.processWorks = processWorks;
window.getFilters = getFilters;
window.filterData = filterData;
window.generateGraph = generateGraph;
window.generateGexfURL = generateGexfURL;
window.generateJSONDataURL = generateJSONDataURL;

Alpine.data('App', () => ({
  params: [{type: 'titleabs', value: ''}],
  maxWorks: 1000,
  state: 'search',
  nextState: '',
  loadingMsg: '',
  count: 0,
  works: [],
  data: {},
  filters: {},
  filteredData: {},
  graph: null,

  loading(nextState, msg = '') {
    this.state = 'loading';
    this.loadingMsg = msg;
    this.nextState = nextState;
  },
  done() {
    this.state = this.nextState;
  },
}));

window.Alpine = Alpine;
Alpine.start();

window.autoComplete = autoComplete;

if (!window.IS_PRODUCTION)
  new EventSource('/esbuild').addEventListener('change', () => location.reload());
