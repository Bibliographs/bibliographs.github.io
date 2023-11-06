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
export const metadataFields = fields.filter(field => field !== 'refs');

export const generateGraph = (data) => {
  let graph = new UndirectedGraph({ allowSelfLoops: false });

  // Step 1: Create the map background (refs)

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
  const refs = new Set(Object.keys(data.refs));
  const refsSets = Object.values(data.sets.refs);
  const doneEdges = new Set(); // Useful to avoid updating edges in both ways (since it's undirected graph)

  // What happens here is that for every single refs (filtered at this point), we go through all the
  // sets of refs (the set of co-cited refs for a work) and if the current ref is in it we increment
  // or create the edge weight between this ref and all the co-cited except for the ones in doneEdges.
  // This avoids double counting.
  for (const ref of refs) {
    for (const refsSet of refsSets) {
      if (refsSet.has(ref)) {
	for (const ref2 of refsSet) {
	  if (ref !== ref2 && !doneEdges.has(ref2)) {
	    graph.updateEdge(ref, ref2, attr => ({
	      ...attr,
	      weight: (attr.weight || 0) + 1,
	    }));
	  }
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
