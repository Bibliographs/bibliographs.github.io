import { UndirectedGraph } from 'graphology';
import { write } from 'graphology-gexf/browser';

export const fieldColors = {
  refs: '#ebebeb',
  authors: '#ffe915',
  sources: '#a7d30d',
  concepts: '#9dabf5',
  institutions: '#e22521',
  countries: '#df60bf',
  funders: '#ff8f2e',
};

export const fields = Object.keys(fieldColors);

export const generateGraph = (data) => {
  const graph = new UndirectedGraph({ allowSelfLoops: false });
  return graph;
};

export const generateGexfURL = (graph) => {
  const gexfString = write(graph);
  const gexfBlob = new Blob([gexfString]);
  return URL.createObjectURL(gexfBlob);
};
