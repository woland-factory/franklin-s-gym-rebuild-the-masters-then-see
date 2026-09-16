import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrendChart } from "./TrendChart";
import chartStyles from "./TrendChart.module.css";

const points = [
  { date: 1000, value: 10 },
  { date: 2000, value: 50 },
  { date: 3000, value: 80 },
];

describe("TrendChart", () => {
  it("renders a line, one dot per point, and an accessible label", () => {
    const { container } = render(
      <TrendChart
        points={points}
        yMin={0}
        yMax={100}
        yTicks={[0, 50, 100]}
        formatValue={(v) => `${v}%`}
        ariaLabel="Hinted ideas recovered across 3 attempts, latest 80 percent."
      />,
    );
    expect(
      screen.getByRole("img", { name: /hinted ideas recovered across 3 attempts/i }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("circle")).toHaveLength(3);
    expect(container.querySelectorAll("polyline")).toHaveLength(1);
  });

  it("labels only the last point directly", () => {
    render(
      <TrendChart
        points={points}
        yMin={0}
        yMax={100}
        yTicks={[0, 50, 100]}
        formatValue={(v) => `${v}%`}
        ariaLabel="summary"
      />,
    );
    const labels = screen.getAllByTestId("trend-value");
    expect(labels).toHaveLength(1);
    expect(labels[0]).toHaveTextContent("80%");
  });

  it("draws a gridline per tick and emphasizes zero when asked", () => {
    const { container } = render(
      <TrendChart
        points={[{ date: 1, value: 2 }]}
        yMin={-3}
        yMax={3}
        yTicks={[-3, 0, 3]}
        formatValue={(v) => (v > 0 ? `+${v}` : `${v}`)}
        zeroEmphasis
        ariaLabel="summary"
      />,
    );
    expect(container.querySelectorAll("line")).toHaveLength(3);
    expect(container.querySelectorAll(`.${chartStyles.zeroLine}`)).toHaveLength(1);
  });

  it("renders a single point as one dot and no line", () => {
    const { container } = render(
      <TrendChart
        points={[{ date: 1, value: 50 }]}
        yMin={0}
        yMax={100}
        yTicks={[0, 50, 100]}
        formatValue={(v) => `${v}%`}
        ariaLabel="summary"
      />,
    );
    expect(container.querySelectorAll("circle")).toHaveLength(1);
    expect(container.querySelectorAll("polyline")).toHaveLength(0);
  });

  it("has no legend", () => {
    const { container } = render(
      <TrendChart
        points={points}
        yMin={0}
        yMax={100}
        yTicks={[0, 50, 100]}
        formatValue={(v) => `${v}%`}
        ariaLabel="summary"
      />,
    );
    expect(container.querySelector("ul, ol, legend")).toBeNull();
  });
});
