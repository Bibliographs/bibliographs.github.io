import van from "vanjs-core";

const { div } = van.tags;

const ProgressBar = (progressState) =>
  div(
    {
      class: "progress-container",
      style: "background-color: lightgray;width: 80%",
    },
    div(
      {
        class: "progress-bar",
        style: () =>
          `background-color: #2196F3;color: white;height: 24px;width: ${progressState.val}%`,
      },
      () => `${progressState.val}%`,
    ),
  );

export default ProgressBar;
