import { UndirectedGraph } from 'graphology';
import { write } from 'graphology-gexf/browser';
import { circular } from "graphology-layout";
import { largestConnectedComponentSubgraph } from "graphology-components";
import forceAtlas2 from 'graphology-layout-forceatlas2';

export const fieldColors = {
  refs: '#ebebeb',
  works: '#202020',
  authors: '#ffe915',
  sources: '#a7d30d',
  concepts: '#9dabf5',
  institutions: '#e22521',
  countries: '#df60bf',
  funders: '#ff8f2e',
};

export const fields = Object.keys(fieldColors);
export const metadataFields = fields.filter(field => field !== 'refs');

const maxRefNodeSize = 900;
const maxMetadataNodeSize = 2500;

export const generateGraph = (data) => {
  let graph = new UndirectedGraph({ allowSelfLoops: false });

  // Step 1: Create the map background (refs)

  console.time('add refs nodes');
  Object.entries(data['refs']).forEach(([id, {count, label, title}]) => {
    graph.addNode(id, {
      label,
      title,
      size: Math.sqrt(maxRefNodeSize * count / data.maxCounts.refs),
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

  // Discard disconnected components
  graph = largestConnectedComponentSubgraph(graph);

  // Spatialize the refs nodes
  console.time('ref force atlas');
  circular.assign(graph);
  forceAtlas2.assign(graph, {
    iterations: 500,
    settings: forceAtlas2.inferSettings(graph),
  });
  console.timeEnd('ref force atlas');

  // Fix the refs nodes in place (final position for refs)
  graph.forEachNode((nodeRef) => graph.mergeNodeAttributes(nodeRef, {fixed: true}));

  // Step 2: Add metadata to the graph

  console.time('add metadata');
  let i = 0;
  let totalMetadataNodes = 0;
  for (const field of metadataFields) {
    totalMetadataNodes += Object.keys(data[field]).length;
  }

  for (const field of metadataFields) {
    for (const [id, {count, label, title}] of Object.entries(data[field])) {
      graph.addNode(id, {
	label,
	size: Math.sqrt(maxMetadataNodeSize * count / data.maxCounts[field]),
	color: fieldColors[field],
	count,
	dataType: field,
      });

      if (title) {
	graph.mergeNodeAttributes(id, {title});
      }

      // Get the list of works containing that metadata
      const works = Object.entries(data.sets[field]).filter(([workId, fieldSet]) => fieldSet.has(id)).map(([workId,]) => workId);

      // Add edges between this metadata and all the refs that are co-cited
      for (const work of works) {
	if (typeof data.sets.refs[work] !== 'undefined') {
	  for (const ref of data.sets.refs[work]) {
	    if (graph.hasNode(ref)) {
	      graph.updateEdge(id, ref, attr => ({
		...attr,
		weight: (attr.weight || 0) + 1,
	      }));
	    }
	  }
	}
      }

      // Put the metadata node at the barycenter of its neighbors
      const neighborsCount = graph.neighbors(id).length;
      if (neighborsCount > 0) {
	let x = 0;
	let y = 0;

	graph.forEachNeighbor(id, (node, attr) => {
	  x += attr.x;
	  y += attr.y;
	});

	// Add some very tiny and unique vector, to prevent nodes to have exactly the same coordinates.
	// The tiny vector must not be random, so that the layout remains reproducible.
	x = x / neighborsCount +
          Math.cos((Math.PI * 2 * i) / totalMetadataNodes) / 100;
	y = y / neighborsCount +
          Math.sin((Math.PI * 2 * i) / totalMetadataNodes) / 100;
	i += 1;

	graph.mergeNodeAttributes(id, {x, y});
      }
    }
  }
  console.timeEnd('add metadata');

  // Discard disconnected components
  graph = largestConnectedComponentSubgraph(graph);

  // Spatialize the metadata nodes
  console.time('metadata force atlas');
  forceAtlas2.assign(graph, {
    iterations: 100,
    settings: forceAtlas2.inferSettings(graph),
  });
  console.timeEnd('metadata force atlas');

  graph.setAttribute('datasource', 'OpenAlex');
  graph.setAttribute('workscount', Object.keys(data.sets.refs).length);

  return graph;
};

export const generateGexfURL = (graph) => {
  const gexfString = write(graph);
  const gexfBlob = new Blob([gexfString]);
  return URL.createObjectURL(gexfBlob);
};
