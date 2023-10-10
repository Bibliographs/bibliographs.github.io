import "@ajusa/lit/src/lit.css";
import './index.css';

import Alpine from 'alpinejs';

import './lib/fetch.js';
import './lib/processing.js';


Alpine.data('App', () => ({
  query: '',
  fromYear: 1900,
  toYear: 2100,
  state: 'init',
  nextState: '',
  loadingMsg: '',
  count: 0,
  works: [],
  data: {},
  filters: {},
  filteredData: {},

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

if (!window.IS_PRODUCTION)
  new EventSource('/esbuild').addEventListener('change', () => location.reload());
