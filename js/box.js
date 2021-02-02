class Histogram {

    constructor(_config) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 960,
            containerHeight: _config.containerHeight || 500,
        }
        this.config.margin = _config.margin || { top: 60, bottom: 20, right: 20, left: 50 }
        this.data = _config.data;

        this.width = this.config.containerWidth - this.config.margin.left - this.config.margin.right;
        this.height = this.config.containerHeight - this.config.margin.top - this.config.margin.bottom;

        this.chart = this.svg.append("g")

        this.forceLevel = _config.forceLevel || 0.15

        this.view = _config.view || "default"
        this.viewLevel = _config.view || "package"
        this.initVis();
    }

    initVis() {
        let vis = this;


        // probably want to cross-reference much of 
        // Sherry's bubbleviz as I can
        // Filtering is something where we need to keep track of ids

        vis.update();
    }

    update() {
        let vis = this;

        // filter the data according to view level
        // and view, eventually
        if (this.viewLevel == "package") {
            vis.boxData = vis.data.packages;
        } else {
            vis.boxData = vis.data.classes;
        }

        vis.simulation = d3.forceSimulation()
            .velocityDecay(0.18)
            .force('x', d3.forceX().strength(vis.forceStrength).x(vis.center.x))
            .force('y', d3.forceY().strength(vis.forceStrength).y(vis.center.y))
            .force('charge', d3.forceManyBody().strength(charge))
            .on('tick', () => vis.ticked(vis));

        vis.simulation.stop();

        vis.render()
    }
    render() {
        let vis = this;
        // need to create 

        let boxGroups = vis.chart.selectAll("g").data(vis.boxData);
        boxGroups = boxGroups.enter().append("g").merge(boxGroups);

        let boxes = boxGroups.selectAll("rect").data(d => { d });

        boxes.enter().append("rect")
            .attr("class", "box")
            .merge(boxes)
            .attr("width", vis.boxWidth)
            .attr("height", vis.boxHeight)
            // colour coded by group
            .style("fill", d => d.group)

        boxes.enter().append("text")
            .attr("dx", 12)
            .attr("dy", ".35em")
            .text(d => d.id);

        vis.simulation.nodes(boxes).restart();

    }
}