import van from "vanjs-core";

const { div } = van.tags;

const ProgressBar = (progressState, label = "") =>
  div(
    {
      class: "progress-container",
      style: "background-color: lightgray;width: 100%",
    },
    div(
      {
        class: "progress-bar",
        style: () =>
          `white-space: nowrap;overflow: visible;background-color: #2196F3;color: white;height: 24px;width: ${progressState.val}%`,
      },
      () => `${label}${progressState.val}%`,
    ),
  );

export default ProgressBar;
