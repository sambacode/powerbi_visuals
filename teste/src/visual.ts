module powerbi.extensibility.visual {
    "use strict";

    import DataView = powerbi.DataView;
    import IVisual = powerbi.extensibility.visual.IVisual;
    import IVisualHost = powerbi.extensibility.visual.IVisualHost;
    import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
    import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

    interface StackedAreaChartDataPoint {
        category: string;
        values: number[];
    }

    export class Visual implements IVisual {
        private host: IVisualHost;
        private svg: d3.Selection<SVGElement, {}, HTMLElement, any>;
        private margin = { top: 20, right: 20, bottom: 30, left: 40 };

        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            this.svg = d3.select(options.element)
                .append("svg")
                .classed("stackedAreaChart", true);
        }

        public update(options: VisualUpdateOptions): void {
            const dataView: DataView = options.dataViews[0];
            const width: number = options.viewport.width - this.margin.left - this.margin.right;
            const height: number = options.viewport.height - this.margin.top - this.margin.bottom;

            this.svg.attr("width", options.viewport.width)
                .attr("height", options.viewport.height);

            if (!dataView || !dataView.categorical || !dataView.categorical.categories || !dataView.categorical.values) {
                return;
            }

            const dateValues = dataView.categorical.categories[0].values as Date[];
            const bookNames = dataView.categorical.values.map(v => v.source.displayName || "");
            const bookValues = dataView.categorical.values.map(v => v.values as number[]);

            const dataPoints: StackedAreaChartDataPoint[] = dateValues.map((date, index) => ({
                category: date.toString(),
                values: bookValues.map(v => v[index])
            }));

            const x = d3.scaleBand()
                .domain(dateValues.map(d => d.toString()))
                .range([this.margin.left, width - this.margin.right])
                .padding(0.1);

            const y = d3.scaleLinear()
                .domain([0, d3.max(dataPoints, d => d3.sum(d.values)) || 0])
                .range([height - this.margin.bottom, this.margin.top]);

            const color = d3.scaleOrdinal(d3.schemeCategory10)
                .domain(bookNames);

            const area = d3.area<StackedAreaChartDataPoint>()
                .x(d => x(d.category)!)
                .y0(d => y(d.values[0]))
                .y1(d => y(d.values[1]));

            const stack = d3.stack<StackedAreaChartDataPoint>()
                .keys(bookNames)
                .value((d, key) => d.values[key] || 0);

            const stackedData = stack(dataPoints);

            this.svg.selectAll(".area")
                .data(stackedData)
                .enter()
                .append("path")
                .attr("class", "area")
                .style("fill", d => color(d.key))
                .attr("d", area);

            // Remove any existing areas if the data changes and there are fewer data points.
            this.svg.selectAll(".area")
                .data(stackedData)
                .exit()
                .remove();
        }

        public destroy(): void {
            // Cleanup code here
        }
    }
}
