import { UndirectedGraph } from 'graphology';
import { write } from 'graphology-gexf/browser';
import { circular } from "graphology-layout";
import { largestConnectedComponentSubgraph } from "graphology-components";
import forceAtlas2 from 'graphology-layout-forceatlas2';

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

function intersection(setA, setB) {
  const _intersection = new Set();
  for (const elem of setB) {
    if (setA.has(elem)) {
      _intersection.add(elem);
    }
  }
  return _intersection;
}

export const generateGraph = (data) => {
  let graph = new UndirectedGraph({ allowSelfLoops: false });

  console.time('add refs nodes');
  Object.entries(data['refs']).forEach(([id, {count}]) => {
    graph.addNode(id, {
      label: id,
      size: Math.sqrt(count),
      color: fieldColors['refs'],
      count,
      dataType: 'refs',
    });
  });
  console.timeEnd('add refs nodes');

  // Add edges between refs that are co-cited
  console.time('add ref edges');
  let refsSet = new Set(Object.keys(data.refs));

  // In order to speed up, we need an intermediate representation.
  // [ref_id, [Set(co-cited_refs)...]]
  // Basically, for each ref there is an array of sets containing the co-cited refs in a particular work.
  // Each set corresponds to a all the references for a work, we then only keep the refs that passed the filter
  // in each of those sets.
  let cocited = Object.keys(data.refs).map((ref) => {
    return [ref, data.cocitedRefs.filter((cocitedRefs) => cocitedRefs.has(ref)).map((cocitedRefs) => intersection(refsSet, cocitedRefs))];
  });

  const doneEdges = new Set(); // Useful to avoid updating edges in both ways (since it's undirected graph)
  for (const [ref, refSets] of cocited) {
    for (const refSet of refSets) {
      for (const ref2 of refSet) {
	if (ref !== ref2 && !doneEdges.has(ref2)) {
	  graph.updateEdge(ref, ref2, attr => ({
	    ...attr,
	    weight: (attr.weight || 0) + 1,
	  }));
	}
      }
    }

    // When we added all the edges of a ref, we know that we won't need any more edges to that ref.
    doneEdges.add(ref);
  }
  console.timeEnd('add ref edges');

  graph = largestConnectedComponentSubgraph(graph);

  console.time('force atlas');
  circular.assign(graph);
  const positions = forceAtlas2.assign(graph, {
    iterations: 1000,
    settings: forceAtlas2.inferSettings(graph),
  });
  console.timeEnd('force atlas');

  graph.setAttribute('datasource', 'OpenAlex');
  return graph;
};

export const generateGexfURL = (graph) => {
  const gexfString = write(graph);
  const gexfBlob = new Blob([gexfString]);
  return URL.createObjectURL(gexfBlob);
};
