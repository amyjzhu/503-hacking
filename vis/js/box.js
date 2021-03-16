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
        this.boxWidth = 600;
        this.boxHeight = 500;
        this.smallBoxWidth = this.boxWidth / 3;
        this.smallBoxHeight = this.boxHeight / 4;

        this.smallestBoxHeight = this.smallBoxHeight / 8;
        this.smallestBoxWidth = this.smallBoxWidth / 3;
        this.highlightingEnabled = _config.highlighting;
        this.performanceMode = _config.performanceMode;

        // this.colours = ["red", "blue", "yellow", "green"]\
        // TODO we should make the colours get lighter or darker by level
        this.colours = d3.interpolateRdYlGn;

        this.zoomBarHeight = 300;
        this.minZoom = 0.25;
        this.maxZoom = 20;
        this.zoomLevel = 1;

        this.centeredOn = _config.centeredOnPackage || _config.centeredOnClass;

        // this.transitionPoints = [0.25];
        // this.transitionPoints = [1.48, 9.875];
        // this.transitionPoints = [1.01, 9.875];
        this.transitionPoints = [.99, 5];
        this.initialized = 0;

        this.view = _config.view || "default"
        // this.viewLevel = _config.view || "package"
        this.viewLevel = _config.view || "class"
        this.classesOnly = _config.classesOnly || false;
        this.currentlyHighlighted = [];
        this.linksHighlighted = [];

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

        // create packages using hierarchy data and assign groups
        // propagate groups downwards
        // we need to use numbers for groups because there will be a lot of groups
        let groupMap = {};
        let level1 = vis.data.hierarchy.filter(d => d.type == vis.level2).map(p => p.parent);
        level1 = Array.from(new Set(level1));
        level1 = level1.map((p, index) => { groupMap[p] = index; return { fqn: p, group: index, type: vis.level1 } })

        // we add the package data here
        vis.boxData = vis.data.nodes.concat(level1);
        vis.boxesToDraw = [];

        console.log({ groupMap })
        console.log(vis.colours)
        vis.colourScale = d3.scaleLinear()
            .domain([0, Object.values(groupMap).length])
            .range([0, 1])

        vis.getColour = d => vis.colours(vis.colourScale(d))


        // TODO make a level1, level2, level3 array for reuse

        vis.visArea = vis.chart.append("g");
        vis.zoomText = vis.chart.append("text").attr("class", "zoom-prompt");

        vis.linkArea = vis.visArea.append("g").attr("class", "links")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6);

        vis.boxArea = vis.visArea.append("g").attr("class", "boxes");

        // append container information to each entity using hierarchy info
        // naive implementation, could be faster
        vis.data.hierarchy.forEach(d => {
            // get child and add parent as container
            let child = vis.boxData.findIndex(child => child.fqn == d.child);
            vis.boxData[child].container = d.parent;
        })

        vis.boxData.forEach(datum => {
            if (datum.type == vis.level2) {
                datum.group = groupMap[datum.container];
            }

            // This would be simpler if we inherit the colour from the
            // class in the SVG step TODO
            let secondPass = [];
            if (datum.type == vis.level3) {
                let container = vis.boxData.find(d => d.fqn == datum.container);
                if (container == undefined) {
                    // do it on a second pass
                    // TODO - complete second pass
                    secondPass.push(datum)
                } else {
                    datum.group = container.group;
                }
            }

        })

        vis.boxData.forEach(node => {
            // get nodes in the hierarchy
            node.sourceOf = vis.data.links.filter(l => l.source == node.fqn);
        })
        console.log(vis.boxData)

        // calculate classes by package
        vis.level2ByLevel1 = {};
        vis.boxData.filter(x => x.type == vis.level1).map(p => p.fqn).forEach(id => {
            vis.level2ByLevel1[id] = vis.boxData.filter(c => c.type == vis.level2 && c.container == id);
        }); // { package1: [class1, class2], package2: [class3]}

        vis.level3ByLevel2 = {};
        vis.boxData.filter(x => x.type == vis.level2).map(c => c.fqn).forEach(id => {
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
            .force('charge', d3.forceManyBody().strength(20))//Math.pow(vis.boxHeight, 0.1)))
            .force('collision', d3.forceCollide().radius(d => Math.sqrt(Math.pow(vis.boxWidth / 2, 2) + Math.pow(vis.boxHeight / 2, 2))))
            .force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
            .on('tick', () => vis.fastTick(vis.boxGroups));
        vis.level1Simulation.stop();

        console.log(vis.centeredOn);
        // center an item, if valid
        if (vis.centeredOn != undefined) {
            let center = vis.boxData.find(f => f.type + f.filePath == vis.centeredOn);

            center.fx = vis.center.x;
            center.fy = vis.center.y;

            if (center.type == vis.level2) {
                let centerContainer = vis.boxData.find(f => `${vis.level1}${center.container}` == f.type + f.fqn);
                console.log(vis.boxData)
                centerContainer.fx = vis.center.x - vis.boxWidth / 2 + vis.smallBoxWidth / 2;
                centerContainer.fy = vis.center.y - vis.boxHeight / 2 + vis.smallBoxHeight / 2;
            }
        }


        // let's also make simulations per class
        vis.level2Simulations = Object.keys(vis.level2ByLevel1).map(level1 => {
            var mapping = {};
            mapping.fqn = level1;
            mapping.simFn = () => {
                var level1Info = vis.boxData.filter(x => x.type == vis.level1).find(p => p.fqn == level1);

                return d3.forceSimulation()
                    .velocityDecay(0.18)
                    .force('x', d3.forceX().strength(vis.forceStrength).x(level1Info.x + vis.boxWidth / 2))
                    .force('y', d3.forceY().strength(vis.forceStrength).y(level1Info.y + vis.boxHeight / 2))
                    .force('charge', d3.forceManyBody().strength(() => -Math.pow(vis.smallBoxHeight, 2) * vis.forceStrength))
                    .force('collision', d3.forceCollide().radius(d => Math.sqrt(Math.pow(vis.smallBoxWidth / 2, 2) + Math.pow(vis.smallBoxHeight / 2, 2))))
                    .force("center", d3.forceCenter(level1Info.x + vis.boxWidth / 2, level1Info.y + vis.boxHeight / 2))
                    .on('tick', () => vis.fastTick(vis));
            }
            mapping.assoc = vis.level2ByLevel1[level1];
            return mapping;
        });

        vis.level3Simulations = Object.keys(vis.level3ByLevel2).map(level2 => {
            // TODO maybe remove if there is no sim
            var mapping = {};
            mapping.fqn = level2;
            mapping.simFn = () => {
                var level2Info = vis.boxData.filter(x => x.type == vis.level2).find(c => c.fqn == level2);
                // console.log(level2Info.x + vis.boxWidth / 2);

                return d3.forceSimulation()
                    .velocityDecay(0.18)
                    .force('x', d3.forceX().strength(vis.forceStrength).x(level2Info.x + vis.smallBoxWidth / 2))
                    .force('y', d3.forceY().strength(vis.forceStrength).y(level2Info.y + vis.smallBoxHeight / 2))
                    .force('charge', d3.forceManyBody().strength(() => -Math.pow(vis.smallestBoxHeight, 2.1) * vis.forceStrength))
                    .force('collision', d3.forceCollide().radius(d => Math.sqrt(Math.pow(vis.smallestBoxWidth / 2, 2) + Math.pow(vis.smallestBoxHeight / 2, 2))))
                    .force("center", d => {
                        return d3.forceCenter(level2Info.x + vis.smallBoxWidth / 2, level2Info.y + vis.smallBoxWidth / 2);
                    })
                    .on('tick', () => vis.fastTick(vis));
            }
            mapping.assoc = vis.level3ByLevel2[level2];
            return mapping;
        });

        console.log(vis.level3Simulations)
        console.log(vis.level2Simulations)

        vis.addZoomLevel();
        vis.addViewButtons();

        var zoom = d3.zoom()
            .scaleExtent([vis.minZoom, vis.maxZoom])
            .filter(function () {
                d3.event.preventDefault();
                // 0 is left mouse, 1 is wheel, 2 is right mouse
                return (event.button === 0 ||
                    event.button === 1 ||
                    event.button === 2);

            });

        vis.svg
            .call(zoom.on("zoom", function () {
                vis.visArea.attr("transform", d3.event.transform);
                let k = d3.event.transform.k;
                let tx = d3.event.transform.x / k * -1;
                let ty = d3.event.transform.y / k * -1;
                let scaledWidth = vis.width / k;
                let scaledHeight = vis.height / k;
                // vis.currentCoords = {x0: }
                console.log(d3.event.transform)
                console.log({ x: tx / k, y: ty / k })

                // TODO there is a smarter way to check this by storing it
                // in a clever data structure
                // maybe ask some GRAIL friends lol 
                vis.withinFrame = (item) => {
                    return (item.x > tx && item.x < tx + scaledWidth) && (item.y > ty && item.y < ty + scaledHeight)
                }

                vis.boxesToDraw = vis.boxData.filter(vis.withinFrame);
                console.log(vis.boxesToDraw)

                // width and height also change with size
                let changed = vis.changeViewLevel();
                vis.zoomLevel = d3.event.transform.k;
                vis.updateZoomLevel();

                // if (!changed) {
                    vis.render();
                    vis.tickAll();

                // }

            }));

        vis.update();
    }

    update() {
        let vis = this;

        // filter the data according to view level
        // and view, eventually
        // include that info in data so the render() can use it

        vis.linkData = vis.data.links.filter(x => x.type == vis.viewLevel);
        if (vis.performanceMode) {
            vis.linksToDraw = [];
        } else {
            vis.linksToDraw = vis.linkData;
        }

        console.log(vis.linkData)


        vis.render();
    }

    render() {
        let vis = this;

        vis.boxGroupsSelect = vis.boxArea.selectAll("g").data(vis.boxesToDraw.filter(d => d.type == vis.level1), d => { return d.fqn });
        vis.boxGroups = vis.boxGroupsSelect.enter().append("g").attr("class", "boxgroups").merge(vis.boxGroupsSelect);

        var boxes = vis.boxGroups.selectAll("rect").data(d => [d]);

        // packages
        boxes.enter().append("rect")
            .attr("class", "box")
            .merge(boxes)
            .attr("width", vis.boxWidth)
            .attr("height", vis.boxHeight)
            // colour coded by group
            .style("fill", d => vis.viewLevel == vis.level1 ? vis.getColour(d.group) : "none")
            .style("stroke", d => vis.viewLevel == vis.level1 ? "none" : vis.getColour(d.group))
            .style("stroke-opacity", vis.viewLevel == vis.level3 ? 0.6 : 1)
            .on("mouseover", d => vis.addHighlighting(d))
            .on("mouseout", d => vis.removeHighlighting(d))
            .on("click", vis.onClick)
            .transition()
            .style("visibility", d => vis.view == "default" || d.views.includes(vis.view) ? (vis.classesOnly ? "hidden" : "visible") : "hidden")
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.fqn) ? 0.5 : 1);

        boxes.exit().remove();

        // classes

        vis.level2Groups = vis.boxArea.selectAll(".level2Group").data(vis.boxesToDraw.filter(d => d.type == vis.level2), d => d.type + d.fqn);
        vis.level2Groups = vis.level2Groups.enter().append("g").attr("class", "level2Group").merge(vis.level2Groups);

        vis.level2Rects = vis.level2Groups.selectAll("rect").data(d => [d]);
        vis.level2Rects = vis.level2Rects.enter()
            .append("rect")
            .attr("class", "level2-box")
            .merge(vis.level2Rects)
            .on("click", vis.onClick)
            .attr("width", vis.smallBoxWidth)
            .attr("height", vis.smallBoxHeight)
            .style("fill", d => vis.viewLevel == vis.level2 ? vis.getColour(d.group) : "none")
            .style("stroke", d => vis.viewLevel == vis.level3 ? vis.getColour(d.group) : "none")
            .style("stroke-opacity", vis.viewLevel == vis.level3 ? 0.5 : 1)
            .on("mouseover", d => vis.addHighlighting(d))
            .on("mouseout", d => vis.removeHighlighting(d))
            .transition()
            .style("visibility", d => { return vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden" })
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.fqn) ? 0.5 : 1);

        // vis.level2Rects.exit().remove()

        // methods
        console.log(vis.boxesToDraw.filter(d => d.type == vis.level2));
        // now we don't even need this since those boxes are guaranteed to be inside
        vis.level3Groups = vis.boxArea.selectAll(".level3Group").data(vis.boxesToDraw.filter(d => d.type == vis.level3), d => d.type + d.fqn);
        vis.level3Groups = vis.level3Groups.enter().append("g").attr("class", "level3Group").merge(vis.level3Groups);

        vis.level3Rects = vis.level3Groups.selectAll("rect").data(d => [d]);
        vis.level3Rects = vis.level3Rects.enter()
            .append("rect")
            .attr("class", "level3-box")
            .merge(vis.level3Rects)
            .attr("width", d => {
                // TODO this should approximate it, but we need to check afterwards
                return d.name == undefined ? vis.smallestBoxWidth : Math.max(d.name.split("\n").map(s => s.length)) * 3.3// for 2px;
                // document.getElementById('text').getComputedTextLength()
            })//vis.smallestBoxWidth)
            .attr("height", vis.smallestBoxHeight)
            .style("fill", d => vis.viewLevel == vis.level3 ? vis.getColour(d.group) : "none")
            .on("mouseover", d => vis.addHighlighting(d))
            .on("mouseout", d => vis.removeHighlighting(d))
            .on("click", vis.onClick)
            .transition()
            .style("visibility", d => { return vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden" })
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.fqn) ? 0.5 : 1);

        // vis.level3Rects.exit().remove();

        var texts = vis.boxGroups.selectAll("text").data(d => [d]);
        texts.enter().append("text")
            .merge(texts)
            .attr("dx", 12)
            .attr("dy", "1em")
            .text(d => d.fqn)
            .style("visibility", d => vis.view == "default" || d.views.includes(vis.view) ? (vis.classesOnly ? "hidden" : "visible") : "hidden")
            .style("opacity", d => !vis.currentlyHighlighted.includes(d.type + d.fqn) ? 0.5 : 1)
            .style('font-size', 24)
            .style("pointer-events", "none");

        texts.exit().remove();

        vis.level2Texts = vis.level2Groups.selectAll("text").data(d => [d]);
        vis.level2Texts = vis.level2Texts.enter().append("text")
            .merge(vis.level2Texts)
            .attr("dx", 12)
            .attr("dy", "1em")
            // .transition()
            .text(d => vis.viewLevel == vis.level1 ? "" : d.name)
            .style("visibility", d => vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden")
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.fqn) ? 0.5 : 1)
            .style("pointer-events", "none");
        vis.level2Texts.exit().remove();

        var level3Texts = vis.level3Groups.selectAll(".title-text").data(d => [d]);
        level3Texts = level3Texts.enter().append("text")
            .attr("class", "title-text")
            .merge(level3Texts)
            .attr("dx", 1)
            .attr("dy", "0.8em")
            // .transition()
            .text(d => vis.viewLevel == vis.level3 ? d.name : "")
            .style("font-size", "5px")
            .style("font-family", "monospace")
            .style("visibility", d => vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden")
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.fqn) ? 0.5 : 1)
            .style("pointer-events", "none");
        vis.level2Texts.exit().remove();

        var level3BodyTexts = vis.level3Groups.selectAll(".body-text").data(d => d.text == undefined ? [] : d.text.split("\n").map(t => { return { text: t, views: d.views, id: d.type + d.fqn } }));
        level3BodyTexts = level3BodyTexts.enter().append("text")
            .attr("class", "body-text")
            .merge(level3BodyTexts)
            .attr("dx", 6)
            .attr("dy", (d, i) => `${5 + i * 1}em`)
            // .transition()
            .text(d => vis.viewLevel == vis.level3 ? d.text : "")
            .style("font-size", "2px")
            .style("visibility", d => { return vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden" })
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.fqn) ? 0.5 : 1)
            .style("pointer-events", "none");

        vis.level2Texts.exit().remove();

        // TODO this might be tricky with visibility

        vis.links = vis.linkArea.selectAll("line").data(vis.linksToDraw, d => { vis.viewLevel == vis.level1 ? d.source.fqn + d.target.fqn : d.source + d.target });
        vis.links = vis.links.join("line")
            .attr("stroke-width", d => d.value)
            .attr("stroke", "#999")
            .attr("stroke-opacity", d => !vis.linksHighlighted.includes(d) && vis.linksHighlighted.length != 0 ? 0.5 : 0.9);

        vis.links.exit().remove();

        if (vis.initialized == 0) {
            // Instantly move packages to final destination
            // vis.level1Simulation.nodes(vis.boxData).restart();

            vis.level1Simulation.nodes(vis.boxData).restart()
                .force("link", d3.forceLink(vis.data.links.filter(x => x.type == vis.level1)).id(d => d.fqn))

            for (var i = 0; i < 20; i++) {
                vis.level1Simulation.tick();
            }
            vis.level1Simulation.stop();
            vis.ticked(vis);

            vis.level2Simulations.forEach(sim => {
                if (sim.sim == undefined) {
                    sim.sim = sim.simFn();
                    sim.sim.nodes(sim.assoc).restart();
                    for (i = 0; i < 100; i++) {
                        sim.sim.tick();
                    }
                    sim.sim.stop();
                    vis.level2Ticked(vis);
                }
            })


            vis.level3Simulations.forEach(sim => {
                if (sim.sim == undefined) {
                    // now we need to create it, if it's the first time...
                    sim.sim = sim.simFn();
                    sim.sim.nodes(sim.assoc).restart();
                    for (i = 0; i < 100; i++) {
                        sim.sim.tick();
                    }
                    sim.sim.stop();
                    vis.level3Ticked(vis);
                }
            });

            vis.initialized = 1;
        }

    }

    tickAll() {
        let vis = this;
        vis.ticked(vis);
        vis.level2Ticked(vis);
        vis.level3Ticked(vis);
    }

    fastTick(selection) {
        selection.each(d => d.x = d.originalX);
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
                let level2 = vis.boxData.find(box => box.fqn == d.container && box.type == vis.level2);
                // let level2 = vis.boxesToDraw.find(box => box.fqn == d.container && box.type == vis.level2);
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

        // TODO this will cause errors if the target is not in the graph. Should be okay to ignore.
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
                .attr("x1", d => { let found = vis.boxData.find(data => d.source == data.fqn); return found == undefined ? 0 : found.x })
                .attr("y1", d => { let found = vis.boxData.find(data => d.source == data.fqn); return found == undefined ? 0 : found.y })
                .attr("x2", d => { let found = vis.boxData.find(data => d.target == data.fqn); return found == undefined ? 0 : found.x })
                .attr("y2", d => { let found = vis.boxData.find(data => d.target == data.fqn); return found == undefined ? 0 : found.y })
                .style("visibility", d => vis.view == "default" || (vis.boxData.find(data => d.source == data.fqn).views.includes(vis.view)
                    && vis.boxData.find(data => d.target == data.fqn).views.includes(vis.view)) ? "visible" : "hidden")
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

            // vis.level3Simulations.forEach(sim => {
            //     if (sim.sim != undefined) {
            //         sim.sim.stop();
            //     }
            // })

            vis.update();
            vis.updateLinks();
            return true;


        } else if (vis.zoomLevel <= viewThreshold && vis.viewLevel != vis.level1) {
            vis.level1Simulation.stop();

            // vis.level2Simulations.forEach(sim => {
            //     if (sim.sim != undefined) {
            //         sim.sim.stop();
            //     }
            // })

            // vis.level3Simulations.forEach(sim => {
            //     if (sim.sim != undefined) {
            //         sim.sim.stop();
            //     }
            // })

            vis.viewLevel = vis.level1;
            vis.update();
            vis.updateLinks();
            return true;

        } else if (vis.zoomLevel >= viewThresholdlevel3 && vis.viewLevel != vis.level3) {
            vis.level1Simulation.stop();

            // vis.level3Simulations.forEach(sim => {
            //     if (sim.sim == undefined) {
            //         // now we need to create it, if it's the first time...
            //         sim.sim = sim.simFn();
            //         sim.sim.nodes(sim.assoc).restart();
            //     }
            // });

            // vis.level2Simulations.forEach(sim => {
            //     if (sim.sim != undefined) {
            //         sim.sim.stop();
            //     }
            // });

            vis.viewLevel = vis.level3;
            vis.update();
            vis.updateLinks();
            return true;
        }

        return false;
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

    findConnected(visited, todo) {
        let vis = this;
        if (todo.length == 0) {
            return visited;
        }
        let item = todo[0];

        // TODO this is actually unidirectional
        // (but we don't display the arrows)
        // (and we should in the future)

        let nodes;
        console.log({ item })
        let connected = vis.boxData.find(f => f.fqn == item).sourceOf;
        if (connected == null) {
            connected = [];
        }
        if (vis.viewLevel == vis.level1) {
            // TODO need to check this new logic with packages
            nodes = connected.map(d => d.target.fqn);
        } else {
            nodes = connected.map(d => d.target);
        }

        // TODO there has to be an explicit connection
        // right now, containment doesn't mean dependency
        // necessary to express inter-level dependencies
        // else we can say "if you contain this method, you should be highlighted too"
        // go through and add the containers of all the connected
        let diff = nodes.filter(x => !visited.nodes.includes(x));

        return vis.findConnected({ nodes: visited.nodes.concat([item]), links: visited.links.concat(connected) }, todo.slice(1).concat(diff));
    }

    onClick = (item) => {
        let vis = this;

        if (d3.event.ctrlKey && item.type == vis.level2) {
            vis.classOnClick(item)
        } else {
            if (vis.performanceMode) {
                vis.linkData.forEach(x => x.highlighted = false);
                vis.linksOnDemand(item);
                vis.render();
                vis.updateLinks(); // necessary?

            }
        }
    }

    linksOnDemand(item) {
        let vis = this;
        // TODO we only need one level of connected
        // TODO memoize and store all the links with the data. Create new linkdata each update of level
        // uhhhh
        // avoid looping through data too many times
        // no separate link data, just update on update using the stored links per node of that level
        // vis.findConnected([], [item.fqn]);
        vis.linksToDraw = item.sourceOf;
    }

    addHighlighting(item) {
        let vis = this;

        if (!vis.highlightingEnabled) return;

        let highlight = vis.findConnected({ nodes: [], links: [] }, [item.fqn]);
        vis.currentlyHighlighted = highlight.nodes;
        vis.linksHighlighted = highlight.links;
        console.log(vis.currentlyHighlighted)

        vis.render();
        vis.updateLinks();
    }

    removeHighlighting() {
        let vis = this;
        if (!vis.highlightingEnabled) return;
        // clear
        vis.currentlyHighlighted = [];
        vis.linksHighlighted = [];
        // vis.linkData.forEach(x => x.highlighted = false);
        // vis.linksToDraw = [];
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