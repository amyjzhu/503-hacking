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
        this.smallBoxWidth = this.boxWidth / 3;
        this.smallBoxHeight = this.boxHeight / 3;

        this.smallestBoxHeight = this.smallBoxHeight / 2;
        this.smallestBoxWidth = this.smallBoxWidth / 2;

        // this.colours = ["red", "blue", "yellow", "green"]\
        // TODO we should make the colours get lighter or darker by level
        this.colours = d3.schemePastel1;

        this.zoomBarHeight = 300;
        this.minZoom = 0.25;
        this.maxZoom = 20;
        this.zoomLevel = 1;

        // this.transitionPoints = [0.25];
        this.transitionPoints = [0.075, 0.5];
        this.initialized = 0;

        this.view = _config.view || "default"
        this.viewLevel = _config.view || "package"
        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.center = {
            x: vis.width / 2,
            y: 1.25 * vis.height / 3
        };

        vis.colourScale = d3.scaleOrdinal()
            .domain([1, 2, 3, 4])
            .range(vis.colours)

        vis.boxData = vis.data.packages.concat(vis.data.classes).concat(vis.data.methods);

        vis.visArea = vis.chart.append("g");

        vis.linkArea = vis.visArea.append("g").attr("class", "links")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6);

        vis.boxArea = vis.visArea.append("g").attr("class", "boxes");

        // calculate classes by package
        vis.classesByPackage = {};
        vis.data.packages.map(p => p.id).forEach(id => {
            vis.classesByPackage[id] = vis.data.classes.filter(c => c.pkg == id);
        });

        vis.methodsByClass = {};
        vis.data.classes.map(c => c.id).forEach(id => {
            vis.methodsByClass[id] = vis.data.methods.filter(m => m.cls == id);
        });

        console.log(vis.methodsByClass);

        function charge() {
            return -Math.pow(vis.boxHeight, 2.2) * vis.forceStrength;
        }

        vis.simulation = d3.forceSimulation()
            .velocityDecay(0.18)
            .force('x', d3.forceX().strength(vis.forceStrength).x(vis.center.x))
            .force('y', d3.forceY().strength(vis.forceStrength).y(vis.center.y))
            .force('charge', d3.forceManyBody().strength(charge))
            .force('collision', d3.forceCollide().radius(d => Math.sqrt(Math.pow(vis.boxWidth / 2, 2) + Math.pow(vis.boxHeight / 2, 2))))
            .force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
            .on('tick', () => vis.ticked(vis));
        vis.simulation.stop();

        // let's also make simulations per class
        vis.perPkgSimulations = Object.keys(vis.classesByPackage).map(pkg => {
            var mapping = {};
            mapping.id = pkg;
            mapping.simFn = () => {
                var pkgInfo = vis.data.packages.find(p => p.id == pkg);
                console.log(pkgInfo.x + vis.boxWidth / 2);

                return d3.forceSimulation()
                    .velocityDecay(0.18)
                    .force('x', d3.forceX().strength(vis.forceStrength).x(pkgInfo.x + vis.boxWidth / 2))
                    .force('y', d3.forceY().strength(vis.forceStrength).y(pkgInfo.y + vis.boxHeight / 2))
                    .force('charge', d3.forceManyBody().strength(() => -Math.pow(vis.smallBoxHeight, 2) * vis.forceStrength))
                    .force('collision', d3.forceCollide().radius(d => Math.sqrt(Math.pow(vis.smallBoxWidth / 2, 2) + Math.pow(vis.smallBoxHeight / 2, 2))))
                    .force("center", d3.forceCenter(pkgInfo.x + vis.boxWidth / 2, pkgInfo.y + vis.boxHeight / 2))
                    .on('tick', () => vis.classTicked(vis));
            }
            mapping.cls = vis.classesByPackage[pkg];
            return mapping;
        });

        vis.perClassSimulations = Object.keys(vis.methodsByClass).map(cls => {
            // TODO maybe remove if there is no sim
            var mapping = {};
            mapping.id = cls;
            mapping.simFn = () => {
                var clsInfo = vis.data.classes.find(c => c.id == cls);
                console.log(clsInfo.x + vis.boxWidth / 2);

                return d3.forceSimulation()
                    .velocityDecay(0.18)
                    .force('x', d3.forceX().strength(vis.forceStrength).x(clsInfo.x + vis.smallBoxWidth / 2))
                    .force('y', d3.forceY().strength(vis.forceStrength).y(clsInfo.y + vis.smallBoxHeight / 2))
                    .force('charge', d3.forceManyBody().strength(() => -Math.pow(vis.smallestBoxHeight, 2.1) * vis.forceStrength))
                    .force('collision', d3.forceCollide().radius(d => Math.sqrt(Math.pow(vis.smallestBoxWidth / 2, 2) + Math.pow(vis.smallestBoxHeight / 2, 2))))
                    .force("center", d => {
                        return  d3.forceCenter(clsInfo.x + vis.smallBoxWidth / 2, clsInfo.y + vis.smallBoxWidth / 2);})
                    .on('tick', () => vis.methodTicked(vis));
            }
            mapping.cls = vis.methodsByClass[cls];
            return mapping;
        });

        console.log(vis.perClassSimulations)
        console.log(vis.perPkgSimulations)

        vis.addZoomLevel();
        vis.addViewButtons();

        vis.update();
    }

    update() {
        let vis = this;

        // filter the data according to view level
        // and view, eventually
        // include that info in data so the render() can use it

        if (this.viewLevel == "package") {
            vis.linkData = vis.data.packageLinks;
        } else if (this.viewLevel == "class") {
            vis.linkData = vis.data.classLinks;
        } else {
            vis.linkData = vis.data.methodLinks;
        }

        vis.render();
    }

    render() {
        let vis = this;

        var zoom = d3.zoom()
            .scaleExtent([vis.minZoom, vis.maxZoom]);

        vis.svg
            .call(zoom.on("zoom", function () {
                vis.visArea.attr("transform", d3.event.transform);
                vis.changeViewLevel();
                vis.zoomLevel = d3.event.transform.k;
                vis.updateZoomLevel();
            }));


        vis.boxGroupsSelect = vis.boxArea.selectAll("g").data(vis.boxData.filter(d => d.type == "package"), d => { return d.type + d.id });
        vis.boxGroups = vis.boxGroupsSelect.enter().append("g").attr("class", "boxgroups").merge(vis.boxGroupsSelect);

        var boxes = vis.boxGroups.selectAll("rect").data(d => [d]);

        // packages
        boxes.enter().append("rect")
            .attr("class", "box")
            .merge(boxes)
            .attr("width", vis.boxWidth)
            .attr("height", vis.boxHeight)
            // colour coded by group
            .style("fill", d => vis.viewLevel == "package" ? vis.colourScale(d.group) : "none")
            .style("stroke", d => vis.viewLevel == "package" ? "none" : vis.colourScale(d.group))
            .transition()
            .style("visibility", d => vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden");
        console.log(boxes)

        // classes
        var classGroupsSelect = vis.boxArea.selectAll(".classGroup").data(vis.boxData.filter(d => d.type == "package"), d => { return d.type + d.id });
        vis.classGroups = classGroupsSelect.enter().append("g").attr("class", "classGroup").merge(classGroupsSelect);

        vis.perClassGroup = vis.classGroups.selectAll("g").data(pkg => { console.log(vis.boxData.filter(d => d.type == "class" && d.pkg == pkg.id)); return vis.boxData.filter(d => d.type == "class" && d.pkg == pkg.id) }, d => d.type + d.id);
        vis.perClassGroup = vis.perClassGroup.enter().append("g").merge(vis.perClassGroup);

        vis.classRects = vis.perClassGroup.selectAll("rect").data(d => [d]);
        vis.classRects = vis.classRects.enter()
            .append("rect")
            .attr("class", "class-box")
            .merge(vis.classRects)
            .attr("width", vis.smallBoxWidth)
            .attr("height", vis.smallBoxHeight)
            .style("fill", d => vis.viewLevel == "class" ? vis.colourScale(d.group) : "none")
            .style("stroke", d => vis.viewLevel == "method" ? vis.colourScale(d.group) : "none")
            .transition()
            .style("visibility", d => { console.log(d.views); return vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden" });

        // methods
        var methodGroupsSelect = vis.boxArea.selectAll(".methodGroup").data(vis.boxData.filter(d => d.type == "class"), d => { return d.type + d.id });
        vis.methodGroups = methodGroupsSelect.enter().append("g").attr("class", "methodGroup").merge(methodGroupsSelect);

        vis.perMethodGroup = vis.methodGroups.selectAll("g").data(cls => { return vis.boxData.filter(d => d.type == "method" && d.cls == cls.id) }, d => d.type + d.id);
        vis.perMethodGroup = vis.perMethodGroup.enter().append("g").merge(vis.perMethodGroup);

        vis.methRects = vis.perMethodGroup.selectAll("rect").data(d => [d]);
        vis.methRects = vis.methRects.enter()
            .append("rect")
            .attr("class", "class-box")
            .merge(vis.methRects)
            .attr("width", vis.smallestBoxWidth)
            .attr("height", vis.smallestBoxHeight)
            .style("fill", d => vis.viewLevel == "method" ? vis.colourScale(d.group) : "none")
            .transition()
            .style("visibility", d => { console.log(d.views); return vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden" });



        var texts = vis.boxGroups.selectAll("text").data(d => [d]);
        texts.enter().append("text")
            .merge(texts)
            .attr("dx", 12)
            .attr("dy", ".35em")
            .text(d => d.id)
            .style("visibility", d => vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden");
        texts.exit().remove();

        vis.classTexts = vis.perClassGroup.selectAll("text").data(d => [d]);
        vis.classTexts = vis.classTexts.enter().append("text")
            .merge(vis.classTexts)
            .attr("dx", 12)
            .attr("dy", ".35em")
            // .transition()
            .text(d => vis.viewLevel == "package" ? "" : d.id)
            .style("visibility", d => vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden");
        vis.classTexts.exit().remove();


        // TODO this might be tricky with visibility
        vis.links = vis.linkArea.selectAll("line").data(vis.linkData, d => d.source + d.target);
        vis.links = vis.links.join("line")
            .attr("stroke-width", d => d.value)
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6);

        vis.links.exit().remove();

        if (vis.initialized == 0) {
            vis.simulation.nodes(vis.boxData).restart()
                // this lower line is optional
                .force("link", d3.forceLink(vis.linkData).id(d => d.type + d.id));

            vis.initialized = 1;
        }

    }

    ticked(vis) {
        vis.boxGroups
            .attr("transform", d => `translate(${d.x}, ${d.y})`);
        vis.boxGroups.exit().remove();

        vis.updateLinks();
    }

    classTicked(vis) {
        vis.perClassGroup
            .attr("transform", d => `translate(${d.x}, ${d.y})`);

        vis.updateLinks();
    }

    methodTicked(vis) {
        vis.perMethodGroup
            .attr("transform", d => `translate(${d.x}, ${d.y})`);

        vis.updateLinks();
    }

    updateLinks() {
        let vis = this;

        // having links go across different force graphs seems a bit troublesome...
        // so this is a hacky workaround for now
        // we can also count the number of nodes... connected and fade them out if they're too far away
        // 
        if (vis.viewLevel == "package") {
            vis.links
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y)
                .style("visibility", d => vis.view == "default" || (d.source.views.includes(vis.view) && d.target.views.includes(vis.view)) ? "visible" : "hidden");

        } else {
            vis.links
                .attr("x1", d => vis.boxData.find(data => d.source == data.type + data.id).x)
                .attr("y1", d => vis.boxData.find(data => d.source == data.type + data.id).y)
                .attr("x2", d => vis.boxData.find(data => d.target == data.type + data.id).x)
                .attr("y2", d => vis.boxData.find(data => d.target == data.type + data.id).y)
                .style("visibility", d => vis.view == "default" || (vis.boxData.find(data => d.source == data.type + data.id).views.includes(vis.view)
                    && vis.boxData.find(data => d.target == data.type + data.id).views.includes(vis.view)) ? "visible" : "hidden");
        }
    }

    changeViewLevel(direction) {
        let vis = this;

        // TODO hacky, need to fix this impl later for extensibility
        var viewThreshold = vis.transitionPoints[0] * (vis.maxZoom - vis.minZoom);
        var viewThresholdMethod = vis.transitionPoints[1] * (vis.maxZoom - vis.minZoom);

        if (vis.zoomLevel >= viewThreshold && vis.zoomLevel <= viewThresholdMethod && vis.viewLevel != "class") {
            vis.simulation.stop();
            vis.viewLevel = "class";

            vis.perPkgSimulations.forEach(sim => {
                if (sim.sim == undefined) {
                    // now we need to create it, if it's the first time...
                    sim.sim = sim.simFn();
                    sim.sim.nodes(sim.cls).restart();
                }
            })

            vis.perClassSimulations.forEach(sim => {
                if (sim.sim != undefined) {
                    sim.sim.stop();
                }
            })

            vis.update();
            vis.updateLinks();

        } else if (vis.zoomLevel <= viewThreshold && vis.viewLevel != "package") {
            vis.simulation.stop();

            vis.perPkgSimulations.forEach(sim => {
                if (sim.sim != undefined) {
                    sim.sim.stop();
                }
            })

            vis.perClassSimulations.forEach(sim => {
                if (sim.sim != undefined) {
                    sim.sim.stop();
                }
            })

            vis.viewLevel = "package";
            vis.update();
            vis.updateLinks();
        } else if (vis.zoomLevel >= viewThresholdMethod && vis.viewLevel != "method") {
            vis.simulation.stop();

            vis.perClassSimulations.forEach(sim => {
                if (sim.sim == undefined) {
                    // now we need to create it, if it's the first time...
                    sim.sim = sim.simFn();
                    sim.sim.nodes(sim.cls).restart();
                }
            });

            vis.perPkgSimulations.forEach(sim => {
                if (sim.sim != undefined) {
                    sim.sim.stop();
                }
            });

            vis.viewLevel = "method";
            vis.update();
            vis.updateLinks();
        }
    }

    addZoomLevel() {
        let vis = this;

        vis.zoomScale = d3.scaleLinear()
            .domain([vis.minZoom, vis.maxZoom])
            .range([0, vis.zoomBarHeight]);

        vis.zoomArea = vis.chart.append("g").attr("class", "zoombar")
            .attr("transform", `translate(${vis.width - 70}, ${vis.height - vis.zoomBarHeight - 20})`);

        // TODO abstract out magic constants
        vis.zoomArea.append("rect")
            .attr("height", vis.zoomBarHeight)
            .attr("width", 50)
            .style("fill", "rgba(186, 85, 211, 0.5)")
            .style("stroke", "rgb(186, 85, 211)")
            .style("stroke-width", 2);


        vis.zoomArea.selectAll("line").data(vis.transitionPoints)
            .enter()
            .append("line")
            .attr("x1", 0)
            .attr("x2", 50)
            .attr("y1", d => vis.zoomBarHeight - vis.zoomScale(d * (vis.maxZoom - vis.minZoom)))
            .attr("y2", d => vis.zoomBarHeight - vis.zoomScale(d * (vis.maxZoom - vis.minZoom)))
            .style("stroke", "black")
            .style("stroke-width", 2);

        vis.updateZoomLevel();
    }

    updateZoomLevel() {
        let vis = this;

        let zoom = vis.zoomArea.selectAll("#zoom-level").data([vis.zoomLevel]);

        zoom.enter().append("line").attr("id", "zoom-level")
            .merge(zoom)
            .attr("x1", -10)
            .attr("x2", 60)
            .attr("y1", d => vis.zoomBarHeight - vis.zoomScale(d))
            .attr("y2", d => vis.zoomBarHeight - vis.zoomScale(d))
            .style("stroke", "Purple")
            .style("stroke-width", 3);
    }

    addViewButtons() {
        let vis = this;

        // collect all view data.
        let views = Array.from(new Set(vis.boxData.map(d => d.views).flat()));
        views.push("default");
        console.log(views);

        d3.select("#button-area").selectAll("button").data(views)
            .enter()
            .append("button")
            .attr("type", "button")
            .attr("class", "viewButton")
            .attr("id", d => "viewButton" + d)
            .text(d => `View ${d}`)
            .attr("value", d => d)
            .on("click", d => { vis.view = d; vis.render(); vis.updateLinks(); });
    }
}