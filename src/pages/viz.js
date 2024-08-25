import { filteredCorpus, graph } from "@/global_state";
import { addMetadataGraph, generateRefGraph } from "@/lib/graph";
import { pageStyle, saveAsPNG, saveGexf } from "@/lib/utils";
import FA2Layout from "graphology-layout-forceatlas2/worker";
import Sigma from "sigma";
import { EdgeLineProgram } from "sigma/rendering";
import van from "vanjs-core";
import { navigate } from "vanjs-routing";

const { main, h1, h4, p, div, button, input, label, span } = van.tags;

function logslider(position) {
  var minp = 0;
  var maxp = 100;

  var minv = Math.log(0.01);
  var maxv = Math.log(100);

  // calculate adjustment factor
  var scale = (maxv - minv) / (maxp - minp);

  return Math.exp(minv + scale * (position - minp));
}

const Viz = () => {
  pageStyle(`
  .settings {
    margin: 0px;
  }
  .settings h4 {
    margin: 4px 0px 0px 0px;
    color:#000;
    font-size:1.2em;
  }
  .settings > div:first-child {
    margin-bottom: 0em;
  }
  .settings input[type="range"] {
    width: 100%;
  }
  .settings p {
    font-size: 0.7em;
    margin: 0;
  }
`);

  const sigmaContainer = div({ id: "sigma" }, () =>
    !graph.val ? "Generate initial background graph first" : "",
  );

  setTimeout(() => {
    graph.val = generateRefGraph(filteredCorpus.val);
  }, 0);

  let layout;
  let sigmaInstance;
  van.derive(() => {
    if (!graph.val) return;
    if (layout) layout.kill();
    layout = new FA2Layout(graph.val, {
      settings: {
        gravity: logslider(settings.gravity.value.rawVal),
        scalingRatio: logslider(settings.scalingRatio.value.rawVal),
      },
    });
    if (sigmaInstance) sigmaInstance.kill();
    sigmaInstance = new Sigma(graph.val, sigmaContainer, {
      labelDensity: settings.labelDensity.value.rawVal,
      labelRenderedSizeThreshold: settings.labelRenderThreshold.value.rawVal,
      itemSizesReference: "positions",
      zoomToSizeRatioFunction: (x) => x,
      defaultEdgeColor: "rgba(204,204,204,0.82)",
      defaultEdgeType: "thinline",
      edgeProgramClasses: {
        thinline: EdgeLineProgram,
      },
    });
    layout.start();
    layoutRunning.val = true;
  });

  const step2Checked = van.state(false);

  van.derive(() => {
    step2Checked.val;
    if (!graph.rawVal) return;
    if (step2Checked.val) {
      graph.rawVal.forEachNode((nodeRef) =>
        graph.rawVal.mergeNodeAttributes(nodeRef, { fixed: true }),
      );
      graph.val = addMetadataGraph(graph.rawVal, filteredCorpus.rawVal);
    } else {
      graph.val = generateRefGraph(filteredCorpus.rawVal);
    }
  });

  const layoutRunning = van.state(true);

  van.derive(() => (layoutRunning.val ? layout?.start() : layout?.stop()));

  const settings = {
    scalingRatio: {
      value: van.state(70),
      min: 0,
      max: 100,
      label: "Scaling",
      info: "overall graph size",
    },
    gravity: {
      value: van.state(20),
      min: 0,
      max: 100,
      label: "Gravity",
      info: "graph compactness",
    },
    labelSize: {
      value: van.state(14),
      min: 0,
      max: 100,
      label: "Label size",
    },
    labelDensity: {
      value: van.state(2),
      min: 0,
      max: 10,
      label: "Label density",
    },
    labelRenderThreshold: {
      value: van.state(0),
      min: 0,
      max: 10,
      label: "Label render threshold",
    },
    nodeScale: {
      value: van.state(100),
      min: 1,
      max: 200,
      label: "Node scale",
    },
  };

  van.derive(() => {
    settings.scalingRatio.value.val;
    if (layout)
      layout.settings.scalingRatio = logslider(settings.scalingRatio.value.val);
  });
  van.derive(() => {
    settings.gravity.value.val;
    if (layout) layout.settings.gravity = logslider(settings.gravity.value.val);
  });
  van.derive(() => {
    settings.labelSize.value.val;
    sigmaInstance?.setSetting("labelSize", settings.labelSize.value.val);
  });
  van.derive(() => {
    settings.labelDensity.value.val;
    sigmaInstance?.setSetting("labelDensity", settings.labelDensity.value.val);
  });
  van.derive(() => {
    settings.labelRenderThreshold.value.val;
    sigmaInstance?.setSetting(
      "labelRenderedSizeThreshold",
      settings.labelRenderThreshold.value.val,
    );
  });
  van.derive(() => {
    settings.nodeScale.value.val;
    graph.rawVal?.forEachNode((nodeRef, attr) =>
      graph.rawVal.mergeNodeAttributes(nodeRef, {
        size: attr.origSize * (settings.nodeScale.value.val / 100),
      }),
    );
  });

  return main(
    { class: "c" },
    h1({ class: "center" }, "3. Visualize the Graph"),
    div(
      { class: "flex-h", style: "justify-content: space-between" },
      sigmaContainer,
      div(
        { class: "flex-v settings" },
        div(
          div(
            { class: "flex-h", style: "justify-content: space-around" },
            h4("Step1"),
            h4("⬅︎ ⮕"),
            h4("Step2"),
          ),
          label(
            { class: "switch" },
            input({
              type: "checkbox",
              checked: step2Checked,
              onchange: (e) => (step2Checked.val = e.target.checked),
            }),
            span({ class: "slider round" }),
          ),
        ),
        div(
          input({
            id: "forceatlas2-checkbox",
            type: "checkbox",
            checked: layoutRunning,
            onchange: (e) => (layoutRunning.val = e.target.checked),
          }),
          label({ for: "forceatlas2-checkbox" }, "ForceAtlas2 Running"),
        ),
        Object.values(settings).map((setting) =>
          div(
            h4(setting.label),
            p(setting.info),
            input({
              type: "range",
              min: setting.min,
              max: setting.max,
              value: setting.value,
              oninput: (e) => (setting.value.val = Number(e.target.value)),
            }),
          ),
        ),
      ),
    ),
    div(
      { class: "flex-h", style: "justify-content: space-evenly;width: 35%" },
      button(
        { class: "btn", onclick: () => navigate("/filters") },
        " ⬅︎ 2. Filters",
      ),
      button(
        {
          class: "btn primary",
          onclick: () => saveGexf(graph.val),
        },
        ".gexf ⬇",
      ),
      button(
        {
          class: "btn primary",
          onclick: () => saveAsPNG(sigmaInstance),
        },
        ".png ⬇",
      ),
    ),
  );
};

export default Viz;
