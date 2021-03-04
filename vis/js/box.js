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
        vis.zoomText = vis.chart.append("text").attr("class", "zoom-prompt");

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
            .force("link", d3.forceLink(vis.data.packageLinks).id(d => d.type + d.id))
            .on('tick', () => vis.fastTick(vis));
        vis.simulation.stop();

        console.log(vis.centeredOn);
        // center an item, if valid
        if (vis.centeredOn != undefined) {
            let center = vis.boxData.find(f => f.type + f.id == vis.centeredOn);

            center.fx = vis.center.x;
            center.fy = vis.center.y;

            if (center.type == "class") {
                let centerPkg = vis.boxData.find(f => `package${center.pkg}` == f.type + f.id);
                centerPkg.fx = vis.center.x - vis.boxWidth / 2 + vis.smallBoxWidth / 2;
                centerPkg.fy = vis.center.y - vis.boxHeight / 2 + vis.smallBoxHeight / 2;
            }
        }

        console.log(vis.data.packages);

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
                        return d3.forceCenter(clsInfo.x + vis.smallBoxWidth / 2, clsInfo.y + vis.smallBoxWidth / 2);
                    })
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
            .style("stroke-opacity", vis.viewLevel == "method" ? 0.6 : 1)
            .on("mouseover", d => vis.addHighlighting(d))
            .on("mouseout", d => vis.removeHighlighting(d))
            .transition()
            .style("visibility", d => vis.view == "default" || d.views.includes(vis.view) ? (vis.classesOnly ? "hidden" : "visible") : "hidden")
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.type + d.id) ? 0.5 : 1);

        console.log(boxes)

        // classes
        var classGroupsSelect = vis.boxArea.selectAll(".classGroup").data(vis.boxData.filter(d => d.type == "package"), d => { return d.type + d.id });
        vis.classGroups = classGroupsSelect.enter().append("g").attr("class", "classGroup").merge(classGroupsSelect);

        vis.perClassGroup = vis.classGroups.selectAll("g").data(pkg => {  return vis.boxData.filter(d => d.type == "class" && d.pkg == pkg.id) }, d => d.type + d.id);
        vis.perClassGroup = vis.perClassGroup.enter().append("g").merge(vis.perClassGroup);

        vis.classRects = vis.perClassGroup.selectAll("rect").data(d => [d]);
        vis.classRects = vis.classRects.enter()
            .append("rect")
            .attr("class", "class-box")
            .merge(vis.classRects)
            .on("click", vis.classOnClick)
            .attr("width", vis.smallBoxWidth)
            .attr("height", vis.smallBoxHeight)
            .style("fill", d => vis.viewLevel == "class" ? vis.colourScale(d.group) : "none")
            .style("stroke", d => vis.viewLevel == "method" ? vis.colourScale(d.group) : "none")
            .style("stroke-opacity", vis.viewLevel == "method" ? 0.5 : 1)
            .on("mouseover", d => vis.addHighlighting(d))
            .on("mouseout", d => vis.removeHighlighting(d))
            .transition()
            .style("visibility", d => { return vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden" })
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.type + d.id) ? 0.5 : 1);

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
            .on("mouseover", d => vis.addHighlighting(d))
            .on("mouseout", d => vis.removeHighlighting(d))
            .transition()
            .style("visibility", d => { return vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden" })
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.type + d.id) ? 0.5 : 1);


        // vis.chart.select(".zoom-text")
        //     .merge(vis.zoomText)
        //     .attr("dx", vis.center.x)
        //     .attr("dy", vis.center.y)
        //     .style("font-size", 40)
        //     // .transition()
        //     .text("Zoom In")
        //     .style("visibility", vis.viewLevel == "package" && vis.classesOnly ? "visible" : "hidden");

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

        vis.classTexts = vis.perClassGroup.selectAll("text").data(d => [d]);
        vis.classTexts = vis.classTexts.enter().append("text")
            .merge(vis.classTexts)
            .attr("dx", 12)
            .attr("dy", ".35em")
            // .transition()
            .text(d => vis.viewLevel == "package" ? "" : d.id)
            .style("visibility", d => vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden")
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.type + d.id) ? 0.5 : 1)
            .style("pointer-events", "none");
        vis.classTexts.exit().remove();

        var methodTexts = vis.perMethodGroup.selectAll(".title-text").data(d => [d]);
        methodTexts = methodTexts.enter().append("text")
            .attr("class", "title-text")
            .merge(methodTexts)
            .attr("dx", 1)
            .attr("dy", "0.8em")
            // .transition()
            .text(d => vis.viewLevel == "method" ? d.id : "")
            .style("font-size", "5px")
            .style("visibility", d => vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden")
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.type + d.id) ? 0.5 : 1)
            .style("pointer-events", "none");
        vis.classTexts.exit().remove();

        var methodBodyTexts = vis.perMethodGroup.selectAll(".body-text").data(d => d.text.split("\n").map(t => { return { text: t, views: d.views, id: d.type + d.id } }));
        methodBodyTexts = methodBodyTexts.enter().append("text")
            .attr("class", "body-text")
            .merge(methodBodyTexts)
            .attr("dx", 6)
            .attr("dy", (d, i) => `${5 + i * 1}em`)
            // .transition()
            .text(d => vis.viewLevel == "method" ? d.text : "")
            .style("font-size", "2px")
            .style("visibility", d => { return vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden" })
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.id) ? 0.5 : 1)
            .style("pointer-events", "none");

        vis.classTexts.exit().remove();

        // TODO this might be tricky with visibility
        console.log(vis.linkData);
        vis.links = vis.linkArea.selectAll("line").data(vis.linkData, d => { vis.viewLevel == "package" ? d.source.id + d.target.id : d.source + d.target});
        vis.links = vis.links.join("line")
            .attr("stroke-width", d => d.value)
            .attr("stroke", "#999")
            .attr("stroke-opacity", d => !d.highlighted && vis.currentlyHighlighted.length != 0 ? 0.5 : 0.9);

        vis.links.exit().remove();

        if (vis.initialized == 0) {
            // Instantly move packages to final destination
            vis.simulation.nodes(vis.boxData).restart();

            // vis.simulation.nodes(vis.boxData).restart()
                // .force("link", d3.forceLink(vis.data.packageLinks).id(d => d.type + d.id))

            for (var i = 0; i < 20; i++) {
                vis.simulation.tick();
            }
            vis.simulation.stop();
            vis.ticked(vis);

            vis.perPkgSimulations.forEach(sim => {
                if (sim.sim == undefined) {
                    sim.sim = sim.simFn();
                    sim.sim.nodes(sim.cls).restart();
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

    classTicked(vis) {
        vis.perClassGroup
            .attr("transform", d => `translate(${d.x}, ${d.y})`);

        vis.updateLinks();
    }

    methodTicked(vis) {
        vis.perMethodGroup
            .attr("transform", d => {
                let cls = vis.boxData.find(box => box.id == d.cls && box.type == "class");
                let width = cls.x + vis.smallBoxWidth - vis.smallestBoxWidth;
                let height = cls.y + vis.smallBoxHeight - vis.smallestBoxHeight;

                // either where we are, or the max coordinate (far edge)
                // either where we are, or the min coordinate (close edge)
                // TODO fix the fact that one is anchored to a corner
                d.x = Math.max(cls.x, Math.min(width, d.x));
                d.y = Math.max(cls.y, Math.min(height, d.y));
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

        if (vis.viewLevel == "package") {
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
        var viewThresholdMethod = vis.transitionPoints[1];

        if (vis.zoomLevel >= viewThreshold && vis.zoomLevel <= viewThresholdMethod && vis.viewLevel != "class") {
            vis.simulation.stop();
            vis.viewLevel = "class";

            // vis.perPkgSimulations.forEach(sim => {
            //     if (sim.sim == undefined) {
            //         // now we need to create it, if it's the first time...
            //         sim.sim = sim.simFn();
            //         sim.sim.nodes(sim.cls).restart();
            //     }
            // })

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
            if (vis.viewLevel == "package") {
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