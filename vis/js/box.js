class StructureVis {

    constructor(_config) {
        this.config = {
            parentElement: _config.parentElement,
        }
        this.config.margin = _config.margin || { top: 60, bottom: 20, right: 20, left: 50 }
        this.data = _config.data;

        var parentDiv = document.getElementById("container");
        this.svg = d3.select(this.config.parentElement);

        this.svg.attr("height", parentDiv.clientHeight);
        this.svg.attr("width", parentDiv.clientWidth);

        this.width = parentDiv.clientWidth
        this.height = parentDiv.clientHeight

        this.chart = this.svg.append("g");

        this.forceStrength = _config.forceStrength || 0.25
        this.boxWidth = 300;
        this.boxHeight = 200;
        this.smallBoxWidth = this.boxWidth / 3;
        this.smallBoxHeight = this.boxHeight / 4;

        this.smallestBoxHeight = this.smallBoxHeight / 3;
        this.smallestBoxWidth = this.smallBoxWidth / 2.5;

        // this.colours = ["red", "blue", "yellow", "green"]\
        // TODO we should make the colours get lighter or darker by level
        this.colours = d3.schemePastel1;

        this.zoomBarHeight = 300;
        this.minZoom = 0.25;
        this.maxZoom = 20;
        this.zoomLevel = 1;

        this.centeredOn = _config.centeredOnPackage || _config.centeredOnClass;

        // this.transitionPoints = [0.25];
        // this.transitionPoints = [1.48, 9.875];
        // this.transitionPoints = [1.01, 9.875];
        this.transitionPoints = [.99, 9.875];
        this.initialized = 0;

        this.view = _config.view || "default"
        // this.viewLevel = _config.view || "package"
        this.viewLevel = _config.view || "class"
        this.classesOnly = _config.classesOnly || false;
        this.currentlyHighlighted = [];

        this.level1 = "package";
        this.level2 = "class";
        this.level3 = "method";

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

        // TODO this will just be the input data
        vis.boxData = vis.data.data;
    
        // TODO make a level1, level2, level3 array for reuse

        vis.visArea = vis.chart.append("g");
        vis.zoomText = vis.chart.append("text").attr("class", "zoom-prompt");

        vis.linkArea = vis.visArea.append("g").attr("class", "links")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6);

        vis.boxArea = vis.visArea.append("g").attr("class", "boxes");

        // calculate classes by package
        vis.level2ByLevel1 = {};
        vis.boxData.filter(x => x.type == vis.level1).map(p => p.id).forEach(id => {
            vis.level2ByLevel1[id] = vis.boxData.filter(c => c.type == vis.level2 && c.container == id);
        }); // { package1: [class1, class2], package2: [class3]}

        vis.level3ByLevel2 = {};
        vis.boxData.filter(x => x.type == vis.level2).map(c => c.id).forEach(id => {
            vis.level3ByLevel2[id] = vis.boxData.filter(m => m.type == vis.level3 && m.container == id);
        });

        console.log(vis.level3ByLevel2);

        function charge() {
            return -Math.pow(vis.boxHeight, 2.2) * vis.forceStrength;
        }



        vis.level1Simulation = d3.forceSimulation()
            .velocityDecay(0.18)
            .force('x', d3.forceX().strength(vis.forceStrength).x(vis.center.x))
            .force('y', d3.forceY().strength(vis.forceStrength).y(vis.center.y))
            .force('charge', d3.forceManyBody().strength(charge))
            .force('collision', d3.forceCollide().radius(d => Math.sqrt(Math.pow(vis.boxWidth / 2, 2) + Math.pow(vis.boxHeight / 2, 2))))
            .force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
            .on('tick', () => vis.fastTick(vis));
        vis.level1Simulation.stop();

        console.log(vis.centeredOn);
        // center an item, if valid
        if (vis.centeredOn != undefined) {
            let center = vis.boxData.find(f => f.type + f.id == vis.centeredOn);

            center.fx = vis.center.x;
            center.fy = vis.center.y;

            if (center.type == vis.level2) {
                let centerContainer = vis.boxData.find(f => `${vis.level1}${center.container}` == f.type + f.id);
                centerContainer.fx = vis.center.x - vis.boxWidth / 2 + vis.smallBoxWidth / 2;
                centerContainer.fy = vis.center.y - vis.boxHeight / 2 + vis.smallBoxHeight / 2;
            }
        }


        // let's also make simulations per class
        vis.level2Simulations = Object.keys(vis.level2ByLevel1).map(level1 => {
            var mapping = {};
            mapping.id = level1;
            mapping.simFn = () => {
                var level1Info = vis.boxData.filter(x => x.type == vis.level1).find(p => p.id == level1);
                console.log(level1Info.x + vis.boxWidth / 2);

                return d3.forceSimulation()
                    .velocityDecay(0.18)
                    .force('x', d3.forceX().strength(vis.forceStrength).x(level1Info.x + vis.boxWidth / 2))
                    .force('y', d3.forceY().strength(vis.forceStrength).y(level1Info.y + vis.boxHeight / 2))
                    .force('charge', d3.forceManyBody().strength(() => -Math.pow(vis.smallBoxHeight, 2) * vis.forceStrength))
                    .force('collision', d3.forceCollide().radius(d => Math.sqrt(Math.pow(vis.smallBoxWidth / 2, 2) + Math.pow(vis.smallBoxHeight / 2, 2))))
                    .force("center", d3.forceCenter(level1Info.x + vis.boxWidth / 2, level1Info.y + vis.boxHeight / 2))
                    .on('tick', () => vis.level2Ticked(vis));
            }
            mapping.assoc = vis.level2ByLevel1[level1];
            return mapping;
        });

        vis.level3Simulations = Object.keys(vis.level3ByLevel2).map(level2 => {
            // TODO maybe remove if there is no sim
            var mapping = {};
            mapping.id = level2;
            mapping.simFn = () => {
                var level2Info = vis.boxData.filter(x => x.type == vis.level2).find(c => c.id == level2);
                console.log(level2Info.x + vis.boxWidth / 2);

                return d3.forceSimulation()
                    .velocityDecay(0.18)
                    .force('x', d3.forceX().strength(vis.forceStrength).x(level2Info.x + vis.smallBoxWidth / 2))
                    .force('y', d3.forceY().strength(vis.forceStrength).y(level2Info.y + vis.smallBoxHeight / 2))
                    .force('charge', d3.forceManyBody().strength(() => -Math.pow(vis.smallestBoxHeight, 2.1) * vis.forceStrength))
                    .force('collision', d3.forceCollide().radius(d => Math.sqrt(Math.pow(vis.smallestBoxWidth / 2, 2) + Math.pow(vis.smallestBoxHeight / 2, 2))))
                    .force("center", d => {
                        return d3.forceCenter(level2Info.x + vis.smallBoxWidth / 2, level2Info.y + vis.smallBoxWidth / 2);
                    })
                    .on('tick', () => vis.level3Ticked(vis));
            }
            mapping.assoc = vis.level3ByLevel2[level2];
            return mapping;
        });

        console.log(vis.level3Simulations)
        console.log(vis.level2Simulations)

        vis.addZoomLevel();
        vis.addViewButtons();

        vis.update();
    }

    update() {
        let vis = this;

        // filter the data according to view level
        // and view, eventually
        // include that info in data so the render() can use it

        vis.linkData = vis.data.links.filter(x => x.type == vis.viewLevel)
        

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


        vis.boxGroupsSelect = vis.boxArea.selectAll("g").data(vis.boxData.filter(d => d.type == vis.level1), d => { return d.type + d.id });
        vis.boxGroups = vis.boxGroupsSelect.enter().append("g").attr("class", "boxgroups").merge(vis.boxGroupsSelect);

        var boxes = vis.boxGroups.selectAll("rect").data(d => [d]);

        // packages
        boxes.enter().append("rect")
            .attr("class", "box")
            .merge(boxes)
            .attr("width", vis.boxWidth)
            .attr("height", vis.boxHeight)
            // colour coded by group
            .style("fill", d => vis.viewLevel == vis.level1 ? vis.colourScale(d.group) : "none")
            .style("stroke", d => vis.viewLevel == vis.level1 ? "none" : vis.colourScale(d.group))
            .style("stroke-opacity", vis.viewLevel == vis.level3 ? 0.6 : 1)
            .on("mouseover", d => vis.addHighlighting(d))
            .on("mouseout", d => vis.removeHighlighting(d))
            .transition()
            .style("visibility", d => vis.view == "default" || d.views.includes(vis.view) ? (vis.classesOnly ? "hidden" : "visible") : "hidden")
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.type + d.id) ? 0.5 : 1);

        console.log(boxes)

        // classes
        var level2GroupSelect = vis.boxArea.selectAll(".level2-group").data(vis.boxData.filter(d => d.type == vis.level1), d => { return d.type + d.id });
        vis.level2Groups = level2GroupSelect.enter().append("g").attr("class", "level2-group").merge(level2GroupSelect);

        vis.level2Groups = vis.level2Groups.selectAll("g").data(level1 => {  return vis.boxData.filter(d => d.type == vis.level2 && d.container == level1.id) }, d => d.type + d.id);
        vis.level2Groups = vis.level2Groups.enter().append("g").merge(vis.level2Groups);

        vis.level2Rects = vis.level2Groups.selectAll("rect").data(d => [d]);
        vis.level2Rects = vis.level2Rects.enter()
            .append("rect")
            .attr("class", "level2-box")
            .merge(vis.level2Rects)
            .on("click", vis.classOnClick)
            .attr("width", vis.smallBoxWidth)
            .attr("height", vis.smallBoxHeight)
            .style("fill", d => vis.viewLevel == vis.level2 ? vis.colourScale(d.group) : "none")
            .style("stroke", d => vis.viewLevel == vis.level3 ? vis.colourScale(d.group) : "none")
            .style("stroke-opacity", vis.viewLevel == vis.level3 ? 0.5 : 1)
            .on("mouseover", d => vis.addHighlighting(d))
            .on("mouseout", d => vis.removeHighlighting(d))
            .transition()
            .style("visibility", d => { return vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden" })
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.type + d.id) ? 0.5 : 1);

        // methods
        var level3GroupsSelect = vis.boxArea.selectAll(".level3Group").data(vis.boxData.filter(d => d.type == vis.level2), d => { return d.type + d.id });
        vis.level3Groups = level3GroupsSelect.enter().append("g").attr("class", "level3Group").merge(level3GroupsSelect);

        vis.level3Groups = vis.level3Groups.selectAll("g").data(level2 => { return vis.boxData.filter(d => d.type == vis.level3 && d.container == level2.id) }, d => d.type + d.id);
        vis.level3Groups = vis.level3Groups.enter().append("g").merge(vis.level3Groups);

        vis.level3Rects = vis.level3Groups.selectAll("rect").data(d => [d]);
        vis.level3Rects = vis.level3Rects.enter()
            .append("rect")
            .attr("class", "level2-box")
            .merge(vis.level3Rects)
            .attr("width", d => { 
                // TODO this should approximate it, but we need to check afterwards
                return Math.max(d.text.split("\n").map(s => s.length)) * 2 // for 2px;
            })//vis.smallestBoxWidth)
            .attr("height",  vis.smallestBoxHeight)
            .style("fill", d => vis.viewLevel == vis.level3 ? vis.colourScale(d.group) : "none")
            .on("mouseover", d => vis.addHighlighting(d))
            .on("mouseout", d => vis.removeHighlighting(d))
            .transition()
            .style("visibility", d => { return vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden" })
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.type + d.id) ? 0.5 : 1);

        var texts = vis.boxGroups.selectAll("text").data(d => [d]);
        texts.enter().append("text")
            .merge(texts)
            .attr("dx", 12)
            .attr("dy", ".35em")
            .text(d => d.id)
            .style("visibility", d => vis.view == "default" || d.views.includes(vis.view) ? (vis.classesOnly ? "hidden" : "visible") : "hidden")
            .style("opacity", d => !vis.currentlyHighlighted.includes(d.type + d.id) ? 0.5 : 1)
            .style("pointer-events", "none");


        texts.exit().remove();

        vis.level2Texts = vis.level2Groups.selectAll("text").data(d => [d]);
        vis.level2Texts = vis.level2Texts.enter().append("text")
            .merge(vis.level2Texts)
            .attr("dx", 12)
            .attr("dy", ".35em")
            // .transition()
            .text(d => vis.viewLevel == vis.level1 ? "" : d.id)
            .style("visibility", d => vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden")
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.type + d.id) ? 0.5 : 1)
            .style("pointer-events", "none");
        vis.level2Texts.exit().remove();

        var level3Texts = vis.level3Groups.selectAll(".title-text").data(d => [d]);
        level3Texts = level3Texts.enter().append("text")
            .attr("class", "title-text")
            .merge(level3Texts)
            .attr("dx", 1)
            .attr("dy", "0.8em")
            // .transition()
            .text(d => vis.viewLevel == vis.level3 ? d.id : "")
            .style("font-size", "5px")
            .style("visibility", d => vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden")
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.type + d.id) ? 0.5 : 1)
            .style("pointer-events", "none");
        vis.level2Texts.exit().remove();

        var level3BodyTexts = vis.level3Groups.selectAll(".body-text").data(d => d.text.split("\n").map(t => { return { text: t, views: d.views, id: d.type + d.id } }));
        level3BodyTexts = level3BodyTexts.enter().append("text")
            .attr("class", "body-text")
            .merge(level3BodyTexts)
            .attr("dx", 6)
            .attr("dy", (d, i) => `${5 + i * 1}em`)
            // .transition()
            .text(d => vis.viewLevel == vis.level3 ? d.text : "")
            .style("font-size", "2px")
            .style("visibility", d => { return vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden" })
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.id) ? 0.5 : 1)
            .style("pointer-events", "none");

        vis.level2Texts.exit().remove();

        // TODO this might be tricky with visibility
        console.log(vis.linkData);
        vis.links = vis.linkArea.selectAll("line").data(vis.linkData, d => { vis.viewLevel == vis.level1 ? d.source.id + d.target.id : d.source + d.target});
        vis.links = vis.links.join("line")
            .attr("stroke-width", d => d.value)
            .attr("stroke", "#999")
            .attr("stroke-opacity", d => !d.highlighted && vis.currentlyHighlighted.length != 0 ? 0.5 : 0.9);

        vis.links.exit().remove();

        if (vis.initialized == 0) {
            // Instantly move packages to final destination
            // vis.level1Simulation.nodes(vis.boxData).restart();

            vis.level1Simulation.nodes(vis.boxData).restart()
                .force("link", d3.forceLink(vis.data.links.filter(x => x.type == vis.level1)).id(d => d.type + d.id))

            for (var i = 0; i < 20; i++) {
                vis.level1Simulation.tick();
            }
            vis.level1Simulation.stop();
            vis.ticked(vis);

            vis.level2Simulations.forEach(sim => {
                if (sim.sim == undefined) {
                    sim.sim = sim.simFn();
                    sim.sim.nodes(sim.assoc).restart();
                }
            })

            vis.initialized = 1;
        }

    }

    fastTick(vis) {
        vis.boxGroups.each(d => d.x = d.originalX);
    }

    ticked(vis) {
        vis.boxGroups
            .attr("transform", d => `translate(${d.x}, ${d.y})`);
        vis.boxGroups.exit().remove();

        vis.updateLinks();
    }

    level2Ticked(vis) {
        vis.level2Groups
            .attr("transform", d => `translate(${d.x}, ${d.y})`);

        vis.updateLinks();
    }

    level3Ticked(vis) {
        vis.level3Groups
            .attr("transform", d => {
                let level2 = vis.boxData.find(box => box.id == d.container && box.type == vis.level2);
                let width = level2.x + vis.smallBoxWidth - vis.smallestBoxWidth;
                let height = level2.y + vis.smallBoxHeight - vis.smallestBoxHeight;

                // either where we are, or the max coordinate (far edge)
                // either where we are, or the min coordinate (close edge)
                // TODO fix the fact that one is anchored to a corner
                d.x = Math.max(level2.x, Math.min(width, d.x));
                d.y = Math.max(level2.y, Math.min(height, d.y));
                return `translate(${d.x}, ${d.y})`;
            });

        vis.updateLinks();
    }

    updateLinks() {
        let vis = this;

        // having links go across different force graphs seems a bit troublesome...
        // so this is a hacky workaround for now
        // we can also count the number of nodes... connected and fade them out if they're too far away

        // TODO we should highlight packages that are related to the current package with a highlighting idiom 

        if (vis.viewLevel == vis.level1) {
            vis.links
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y)
                .style("visibility", d => vis.view == "default" || (d.source.views.includes(vis.view) && d.target.views.includes(vis.view)) ?
                    (vis.classesOnly ? "hidden" : "visible") : "hidden")


        } else {
            vis.links
                .attr("x1", d => vis.boxData.find(data => d.source == data.type + data.id).x)
                .attr("y1", d => vis.boxData.find(data => d.source == data.type + data.id).y)
                .attr("x2", d => vis.boxData.find(data => d.target == data.type + data.id).x)
                .attr("y2", d => vis.boxData.find(data => d.target == data.type + data.id).y)
                .style("visibility", d => vis.view == "default" || (vis.boxData.find(data => d.source == data.type + data.id).views.includes(vis.view)
                    && vis.boxData.find(data => d.target == data.type + data.id).views.includes(vis.view)) ? "visible" : "hidden")
        }
    }

    changeViewLevel(direction) {
        let vis = this;

        // TODO hacky, need to fix this impl later for extensibility
        var viewThreshold = vis.transitionPoints[0];
        var viewThresholdlevel3 = vis.transitionPoints[1];

        if (vis.zoomLevel >= viewThreshold && vis.zoomLevel <= viewThresholdlevel3 && vis.viewLevel != vis.level2) {
            vis.level1Simulation.stop();
            vis.viewLevel = vis.level2;

            // vis.level2Simulations.forEach(sim => {
            //     if (sim.sim == undefined) {
            //         // now we need to create it, if it's the first time...
            //         sim.sim = sim.simFn();
            //         sim.sim.nodes(sim.assoc).restart();
            //     }
            // })

            vis.level3Simulations.forEach(sim => {
                if (sim.sim != undefined) {
                    sim.sim.stop();
                }
            })

            vis.update();
            vis.updateLinks();

        } else if (vis.zoomLevel <= viewThreshold && vis.viewLevel != vis.level1) {
            vis.level1Simulation.stop();

            vis.level2Simulations.forEach(sim => {
                if (sim.sim != undefined) {
                    sim.sim.stop();
                }
            })

            vis.level3Simulations.forEach(sim => {
                if (sim.sim != undefined) {
                    sim.sim.stop();
                }
            })

            vis.viewLevel = vis.level1;
            vis.update();
            vis.updateLinks();
        } else if (vis.zoomLevel >= viewThresholdlevel3 && vis.viewLevel != vis.level3) {
            vis.level1Simulation.stop();

            vis.level3Simulations.forEach(sim => {
                if (sim.sim == undefined) {
                    // now we need to create it, if it's the first time...
                    sim.sim = sim.simFn();
                    sim.sim.nodes(sim.assoc).restart();
                }
            });

            vis.level2Simulations.forEach(sim => {
                if (sim.sim != undefined) {
                    sim.sim.stop();
                }
            });

            vis.viewLevel = vis.level3;
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
            .attr("y1", d => vis.zoomBarHeight - vis.zoomScale(d))
            .attr("y2", d => vis.zoomBarHeight - vis.zoomScale(d))
            .style("stroke", "black")
            .style("stroke-width", 2);

        vis.updateZoomLevel();
    }

    addHighlighting(item) {
        let vis = this;

        let findAllRec = (visited, todo) => {
            if (todo.length == 0) {
                return visited;
            }
            let item = todo[0];

            // TODO this is actually unidirectional
            // (but we don't display the arrows)
            // (and we should in the future)
            let connected;
            if (vis.viewLevel == vis.level1) {
                connected = vis.linkData.filter(d => (d.source.type + d.source.id) == item);
                connected.forEach(x => x.highlighted = true);
                console.log(vis.linkData.filter(x => x.highlighted));
                connected = connected.map(d => d.target.type + d.target.id);
                
            } else {
                connected = vis.linkData.filter(d => d.source == item);
                connected.forEach(x => x.highlighted = true);
                connected = connected.map(d => d.target);
            }

            // TODO there has to be an explicit connection
            // right now, containment doesn't mean dependency
            // necessary to express inter-level dependencies
            // else we can say "if you contain this method, you should be highlighted too"
            let diff = connected.filter(x => !visited.includes(x));

            return findAllRec(visited.concat([item]), todo.slice(1).concat(diff));

        }

        vis.currentlyHighlighted = findAllRec([], [item.type + item.id]);

        vis.render();
        vis.updateLinks();
    }

    removeHighlighting() {
        let vis = this;
        // clear
        vis.currentlyHighlighted = [];
        vis.linkData.forEach(x => x.highlighted = false);
        vis.render();
        vis.updateLinks();

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

    // credits: richard maloney 2006
    getTintedColor(color, v) {
        if (color.length > 6) { color = color.substring(1, color.length) }
        var rgb = parseInt(color, 16);
        var r = Math.abs(((rgb >> 16) & 0xFF) + v); if (r > 255) r = r - (r - 255);
        var g = Math.abs(((rgb >> 8) & 0xFF) + v); if (g > 255) g = g - (g - 255);
        var b = Math.abs((rgb & 0xFF) + v); if (b > 255) b = b - (b - 255);
        r = Number(r < 0 || isNaN(r)) ? 0 : ((r > 255) ? 255 : r).toString(16);
        if (r.length == 1) r = '0' + r;
        g = Number(g < 0 || isNaN(g)) ? 0 : ((g > 255) ? 255 : g).toString(16);
        if (g.length == 1) g = '0' + g;
        b = Number(b < 0 || isNaN(b)) ? 0 : ((b > 255) ? 255 : b).toString(16);
        if (b.length == 1) b = '0' + b;
        return "#" + r + g + b;
    }
}