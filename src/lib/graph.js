import { UndirectedGraph } from 'graphology';
import { write } from 'graphology-gexf/browser';

export const generateGraph = (data) => {
  const graph = new UndirectedGraph({ allowSelfLoops: false });
  return graph;
};

export const generateGexfURL = (graph) => {
  const gexfString = write(graph);
  const gexfBlob = new Blob([gexfString]);
  return URL.createObjectURL(gexfBlob);
};
