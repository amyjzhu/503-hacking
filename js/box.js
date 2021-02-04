class StructureVis {

    constructor(_config) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 1200,
            containerHeight: _config.containerHeight || 800,
        }
        this.config.margin = _config.margin || { top: 60, bottom: 20, right: 20, left: 50 }
        this.data = _config.data;

        this.width = this.config.containerWidth - this.config.margin.left - this.config.margin.right;
        this.height = this.config.containerHeight - this.config.margin.top - this.config.margin.bottom;

        this.svg = d3.select(this.config.parentElement);
        this.chart = this.svg.append("g");

        this.forceStrength = _config.forceStrength || 0.25
        this.boxWidth = 200;
        this.boxHeight = 100;
        // this.colours = ["red", "blue", "yellow", "green"]
        this.colours = d3.schemePastel1;

        this.view = _config.view || "default"
        this.viewLevel = _config.view || "package"
        this.initVis();
    }

    initVis() {
        let vis = this;

        // TODO tweak // taken directly from Sherry
        vis.center = {
            x: vis.width / 2,
            y: 1.25 * vis.height / 3
        };

        vis.colourScale = d3.scaleOrdinal()
            .domain([1, 2, 3, 4]) // TODO make input
            .range(vis.colours)

        // probably want to cross-reference much of 
        // Sherry's bubbleviz as I can
        // Filtering is something where we need to keep track of ids

        vis.visArea = vis.chart.append("g");

        vis.linkArea = vis.visArea.append("g").attr("class", "links")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6);

        vis.boxArea = vis.visArea.append("g").attr("class", "boxes");

        // let's add some buttons

         // charge function that is called for each node, creates repulsion between nodes
        // TODO tweak // taken directly from Sherry
        function charge() {
            return -Math.pow(vis.boxHeight, 2.2) * vis.forceStrength;
        }

        // maybe I could change initial position by 
        // setting is before we start the simulation?
        vis.simulation = d3.forceSimulation()
            .velocityDecay(0.18)
            // .force("link", d3.forceLink(vis.linkData).id(d => d.id))
            .force('x', d3.forceX().strength(vis.forceStrength).x(vis.center.x))
            .force('y', d3.forceY().strength(vis.forceStrength).y(vis.center.y))
            .force('charge', d3.forceManyBody().strength(charge))
            // .force("charge", d3.forceManyBody())
            .force('collision', d3.forceCollide().radius(d => Math.sqrt(Math.pow(vis.boxWidth / 2, 2) + Math.pow(vis.boxHeight / 2, 2))))
            .force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
            .on('tick', () => vis.ticked(vis));
        vis.simulation.stop();

        vis.update();
    }

    update() {
        let vis = this;

        // filter the data according to view level
        // and view, eventually
        if (this.viewLevel == "package") {
            vis.boxData = vis.data.packages;
            vis.linkData = vis.data.packageLinks;
        } else {
            vis.boxData = vis.data.classes;
            vis.linkData = vis.data.classLinks;
        }

        vis.render();
    }

    render() {
        let vis = this;
        // need to create 

        console.log(vis.boxData)
        vis.boxGroupsSelect = vis.boxArea.selectAll("g").data(vis.boxData, d => { console.log(vis.viewLevel + d.id); return vis.viewLevel + d.id });
        console.log(vis.boxGroups);
        vis.boxGroups = vis.boxGroupsSelect.enter().append("g").merge(vis.boxGroupsSelect);
        vis.svg
            // .on("wheel", function (d) {
            //     var direction = d3.event.wheelDelta < 0 ? 'down' : 'up';
            //     vis.changeViewLevel(direction);
            // });
            .call(d3.zoom().on("zoom", function () {
                vis.chart.attr("transform", d3.event.transform)
                // also, after a certain threshold, we should change direction

            }))

        vis.boxGroupsSelect.exit().remove();


        var boxes = vis.boxGroups.selectAll("rect").data(d => [d]);

        boxes.enter().append("rect")
            .attr("class", "box")
            .merge(boxes)
            .attr("width", vis.boxWidth)
            .attr("height", vis.boxHeight)
            // .on("wheel", function(d){
            //     var direction = d3.event.wheelDelta < 0 ? 'down' : 'up';
            //     vis.changeViewLevel(direction);
            // })
            // colour coded by group
            .style("fill", d => vis.colourScale(d.group));
        console.log(boxes)
        boxes.exit().remove();

        var texts = vis.boxGroups.selectAll("text").data(d => [d]);

        texts.enter().append("text")
            .merge(texts)
            .attr("dx", 12)
            .attr("dy", ".35em")
            .text(d => d.id);
        texts.exit().remove();

        vis.links = vis.linkArea.selectAll("line").data(vis.linkData);
        vis.links = vis.links.join("line")
            .attr("stroke-width", d => d.value)
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6);

        vis.links.exit().remove();

        vis.simulation.nodes(vis.boxData).restart()
        .force("link", d3.forceLink(vis.linkData).id(d => d.id));
        
    }

    // todo why is there even a separation between the two? need to 
    // investigate forceSimulation more
    ticked(vis) {
        // console.log(vis.boxGroups)
        vis.boxGroups
            .attr("transform", d => `translate(${d.x}, ${d.y})`);
        vis.boxGroups.exit().remove();

        vis.links
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)
    }

    changeViewLevel(direction) {
        let vis = this;

        // TODO make sure things in class stay in view
        // TODO want each box to split up naturally
        if (direction == "up") {
            if (vis.viewLevel == "package") {

                vis.simulation.stop();

                // vis.simulation.stop();
                // We need to set the starting positions of classes to match packages
                // Still goes absolutely insane though
                vis.data.classes = vis.data.classes.map(cls => {
                    var pkg = vis.data.packages.find(p => p.id == cls.pkg)
                    cls.x = pkg.x;
                    cls.y = pkg.y;
                    return cls;
                });
                
                vis.viewLevel = "class";
                // reset the sim
                vis.simulation.alpha(0.5);
                vis.update();
            }
        } else {
            if (vis.viewLevel == "class") {
                vis.simulation.stop();

                vis.viewLevel = "package";
                vis.simulation.alpha(0.5);
                vis.update();
            }
        }
    }
}