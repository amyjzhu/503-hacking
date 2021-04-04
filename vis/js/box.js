"use strict";

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
        this.smallBoxWidth = 200;
        this.smallBoxHeight = 500 / 3;
        // this.smallBoxHeight = 500/4;

        this.smallestBoxWidth = 200 / 3;
        this.smallestBoxHeight = 500 / 32;

        this.defaultClassWidth = 200;
        this.defaultClassHeight = 500 / 3;

        this.highlightingEnabled = _config.highlighting;
        this.performanceMode = _config.performanceMode;

        // this.colours = ["red", "blue", "yellow", "green"]\
        // TODO we should make the colours get lighter or darker by level
        // this.colours = d3.interpolateRdYlGn;
        this.colours = d3.interpolateViridis;
        // this.colours = d3.interpolateWarm;

        this.zoomBarHeight = 300;
        this.minZoom = 0.05;
        this.maxZoom = 20;
        this.zoomLevel = 1;

        this.centeredOn = _config.centeredOnPackage || _config.centeredOnClass;

        if(this.centeredOn == 'random') {
            let classes = this.data.nodes.filter(node => node.type == 'class')
            let randomClass = `class${classes[Math.floor(Math.random()*classes.length)].filePath}`
            console.log(`Random class is ${randomClass}`)
            this.centeredOn = randomClass
        }

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
        this.clickedNodes = [];

        this.level1 = "package";
        this.level2 = "class";
        this.level3 = "method";

        this.methodSuffix = "(...)" // Suffix to append to method names. `doStuff` becomes `doStuff(...)`

        this.setLoader(parentDiv);

        // setTimeout so drawing the loader element comes 
        // before all the processing 
        setTimeout(() => 
            this.initVis(), 0);
    }

    setLoader(target) {
        console.log("loading!!!")
        let vis = this;

        var opts = {
            lines: 9, // The number of lines to draw
            length: 9, // The length of each line
            width: 5, // The line thickness
            radius: 14, // The radius of the inner circle
            color: '#4b2e83', // #rgb or #rrggbb or array of colors
            speed: 1, // Rounds per second
            trail: 40, // Afterglow percentage
            className: 'spinner', // The CSS class to assign to the spinner
          };

          var spinner = new Spinner(opts).spin(target);

          vis.callWhenLoaded = () => spinner.stop();
    }


    processData() {
        let vis = this;
        console.log("processing")
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

            // append container information to each entity using hierarchy info
        // naive implementation, could be faster
        vis.data.hierarchy.forEach(d => {
            // get child and add parent as container
            let child = vis.boxData.findIndex(child => child.fqn == d.child);
            if (child != -1) {
                vis.boxData[child].container = d.parent;
            } else {
                console.log("Could not find child for ", d);
            }
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

    }

    createForceSimulations() {
        let vis = this;

        vis.level1Simulation = d3.forceSimulation()
            .velocityDecay(0.18)
            .force('x', d3.forceX().strength(vis.forceStrength).x(vis.center.x))
            .force('y', d3.forceY().strength(vis.forceStrength).y(vis.center.y))
            .force('charge', d3.forceManyBody().strength(20))//Math.pow(vis.boxHeight, 0.1)))
            // .force('collision', d3.forceCollide().radius(d => Math.sqrt(Math.pow(vis.boxWidth / 2, 2) + Math.pow(vis.boxHeight / 2, 2))))
            .force('collision', d3.forceCollide().radius(d => Math.sqrt(Math.pow(vis.level2CollisionSquare / 2, 2) * 2)))
            .force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
            .on('tick', () => vis.fastTick(vis.boxGroups));
        vis.level1Simulation.stop();


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
                    .force('charge', d3.forceManyBody().strength(() => 200))//-Math.pow(vis.smallestBoxHeight, 2.1) * vis.forceStrength))
                    .force('collision', d3.forceCollide().radius(d => Math.sqrt(Math.pow(vis.smallestBoxWidth / 2, 2) + Math.pow(vis.smallestBoxHeight / 2, 2))))
                    .force("center", d => {
                        return d3.forceCenter(level2Info.x + vis.smallBoxWidth / 2, level2Info.y + vis.smallBoxWidth / 2);
                    })
                    .on('tick', () => vis.fastTick(vis));
            }
            mapping.assoc = vis.level3ByLevel2[level2];
            return mapping;
        });
    }
    
    createMarkerDefinitions() {
        let vis = this;

        let markerBoxWidth = 20;
        let markerBoxHeight = 20;
        let refX = markerBoxWidth / 2;
        let refY = markerBoxHeight / 2;
        let markerWidth = 10;
        let markerHeight = 10;
        let arrowPoints = [[0, 0], [0, 20], [20, 10]];

        vis.svg
            .append('defs')
            .append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', [0, 0, markerBoxWidth, markerBoxHeight])
            .attr('refX', refX)
            .attr('refY', refY)
            .attr('markerWidth', markerWidth)
            .attr('markerHeight', markerHeight)
            .attr('orient', 'auto-start-reverse')
            .append('path')
            .attr('d', d3.line()(arrowPoints))
            .attr('stroke', 'black');

    }

    configureZoomSettings() {
        let vis = this;

        vis.zoom = d3.zoom()
            .scaleExtent([vis.minZoom, vis.maxZoom])
            .filter(function (event) {
                // event.preventDefault(); // Changing it doesn't seem to do anything. Can it be removed? 
                // 0 is left mouse, 1 is wheel, 2 is right mouse
                return (event.button === 0 ||
                    event.button === 1 ||
                    event.button === 2);

            });

        $(window).resize(function () {
            let oldWidth = vis.width;
            let oldHeight = vis.height;
            let theSvg = $("svg#vis");
            vis.width = theSvg.width();
            vis.height = theSvg.height();
            console.log("Old width & height: ", oldWidth, oldHeight);
            console.log("New width & height: ", vis.width, vis.height);
            d3.select("g.zoombar").attr("transform", `translate(${vis.width - 70}, ${vis.height - vis.zoomBarHeight - 20})`);
            vis.render();
            vis.tickAll();
        })

        
        vis.svg
            .call(vis.zoom.on("zoom", function ({transform}, d) {
                vis.visArea.attr("transform", transform);
                let k = transform.k;
                let tx = transform.x / k * -1;
                let ty = transform.y / k * -1;
                let scaledWidth = vis.width / k;
                let scaledHeight = vis.height / k;

                console.log(transform)
                console.log({ x: tx / k, y: ty / k })

                vis.windowX = tx;
                vis.windowY = ty;

                // TODO there is a smarter way to check this by storing it
                // in a clever data structure
                // maybe ask some GRAIL friends lol 
                vis.withinFrame = (item) => {
                    let w = (item.type == vis.level1) ? vis.boxWidth : ((item.type == vis.level2) ? vis.smallBoxWidth : vis.smallestBoxWidth);
                    let h = (item.type == vis.level1) ? vis.boxHeight : ((item.type == vis.level2) ? vis.smallBoxHeight : vis.smallestBoxHeight);
                    // Upper left
                    let x1 = item.x;
                    let y1 = item.y;
                    // Lower right
                    let x3 = item.x + w;
                    let y3 = item.y + h;

                    // Box is to the left of the screen or screen is to the left of the box
                    if (x1 >= tx + scaledWidth || tx >= x3) {
                        return false;
                    }
                    // Box is below the screen or screen is below the box
                    if (y1 >= ty + scaledHeight || ty >= y3) {
                        return false;
                    }
                    return true;
                }

                vis.boxesToDraw = vis.boxData.filter(vis.withinFrame);
                console.log("Boxes to draw")
                console.log(vis.boxesToDraw)

                // width and height also change with size
                let changed = vis.changeViewLevel();
                vis.zoomLevel = transform.k;
                vis.updateZoomLevel();

                // if (!changed) {
                vis.render();
                vis.tickAll();

                // }

            }));
    }

    setUpVisAreas() {
        let vis = this;
        vis.center = {
            x: vis.width / 2,
            y: 1.25 * vis.height / 3
        };

        vis.getColour = d => vis.colours(vis.colourScale(d))

        vis.visArea = vis.chart.append("g").attr("class", "vis-area");
        vis.zoomText = vis.chart.append("text").attr("class", "zoom-prompt");

        vis.linkArea = vis.visArea.append("g").attr("class", "links");

        vis.boxArea = vis.visArea.append("g").attr("class", "boxes");
    }

    centerWindowOnEntity() {
        let vis = this;

        console.log(vis.centeredOn);

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

    }

    initVis() {
        console.time('initVis')
        let vis = this;

        vis.processData();

        vis.setUpVisAreas();
        
        let dynamicallySetSizes = () => {
            // we need the container to be at least squared big as the height and width 
            // to avoid overlapping and keep them within the containers
            let maxLevel3 = Math.max(...Object.values(vis.level2ByLevel1).map(a => a.length));
            let alpha = 1;

            // methods are a bit weird though since their size is variable
            let sqrtMaxLevel3 = Math.sqrt(maxLevel3);
            // also, make them square (why not?)
            vis.level3CollisionSquare = sqrtMaxLevel3 * Math.max(vis.smallestBoxHeight, vis.smallestBoxWidth) * alpha;
            // vis.smallBoxHeight = sqrtMaxLevel3 * vis.smallestBoxHeight * alpha;
            // vis.smallBoxWidth = vis.smallBoxHeight;

            // need to determine package sizes based on how many entities there are
            let maxLevel2 = Math.max(...Object.values(vis.level2ByLevel1).map(a => a.length));
            let sqrtMaxLevel2 = Math.sqrt(maxLevel2);
            // vis.boxWidth = sqrtMaxLevel2 * vis.smallBoxWidth * alpha;
            // vis.boxHeight = sqrtMaxLevel2 * vis.smallBoxHeight * alpha;
            vis.level2CollisionSquare = sqrtMaxLevel2 * Math.max(vis.smallBoxHeight, vis.smallBoxWidth) * alpha;
        }

        dynamicallySetSizes();

        vis.centerWindowOnEntity();

        vis.createForceSimulations();

        vis.addZoomLevel();
        vis.addViewButtons();

        vis.configureZoomSettings();

        vis.createMarkerDefinitions();

        if (vis.performanceMode) {
            // Don't draw links in performance mode
            vis.linksToDraw = [];
            vis.linkData = vis.data.links;
        }

        console.timeEnd('initVis')

        console.time('vis.update')
        vis.update();
        console.timeEnd('vis.update')

        // Disable zoom on double-click
        d3.select("svg").on("dblclick.zoom", null);

        // Create an initial zoom event to populate the winodw
        vis.svg.call(vis.zoom.transform, d3.zoomIdentity)
    }

    update() {
        let vis = this;

        // filter the data according to view level
        // and view, eventually
        // include that info in data so the render() can use it

        if (!vis.performanceMode) {
            vis.linkData = vis.data.links.filter(x => x.type == vis.viewLevel);
            vis.linksToDraw = vis.linkData;
        }

        console.log(vis.linkData)


        vis.render();
    }

    applyForceSimulations() {
        let vis = this;
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
            vis.callWhenLoaded();
        
        }
    }

    renderEntityBoxes() {
        let vis = this;
        vis.boxGroupsSelect = vis.boxArea.selectAll("g").data(vis.boxesToDraw.filter(d => d.type == vis.level1), d => { return d.fqn });
        vis.boxGroups = vis.boxGroupsSelect.enter().append("g").attr("class", "boxgroups").merge(vis.boxGroupsSelect);

        var boxes = vis.boxGroups.selectAll("rect").data(d => [d]);

        function isLevel1(vis) {
            return vis.viewLevel === vis.level1;
        }
        function isLevel2(vis) {
            return vis.viewLevel === vis.level2;
        }
        function isLevel3(vis) {
            return vis.viewLevel === vis.level3;
        }

        function getLevelClass(vis) {
            if (isLevel1(vis)) {
                return "level-1";
            } else if (isLevel2(vis)) {
                return "level-2";
            }
            return "level-3";
        }

        // console.log("View level: ", vis.viewLevel);
        // console.log("Is level 1?: ", isLevel1(vis))
        // console.log("Is level 2?: ", isLevel2(vis))
        // console.log("Is level 3?: ", isLevel3(vis))


        // packages
        boxes.enter().append("rect")
            .attr("class", "box hi " + getLevelClass(vis))
            .merge(boxes)
            .attr("class", "box " + getLevelClass(vis))
            // .attr("width", vis.boxWidth)
            // .attr("height", vis.boxHeight)
            // colour coded by group
            .style("fill", d => isLevel1(vis) ? vis.getColour(d.group) : "none")
            .style("stroke", d => isLevel1(vis) ? "none" : vis.getColour(d.group))
            // .style("stroke-opacity", isLevel3() ? 0.6 : 1)
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
            .attr("class", "level2-box " + getLevelClass(vis))
            .on("click", vis.onClick)
            // .attr("width", vis.smallBoxWidth)
            // .attr("height", vis.smallBoxHeight)
            .style("fill", d => isLevel2(vis) ? vis.getColour(d.group) : "none")
            .style("stroke", d => isLevel3(vis) ? vis.getColour(d.group) : "none")
            // .style("stroke-opacity", isLevel3(vis) ? 0.5 : 1)
            .on("mouseover", d => vis.addHighlighting(d))
            .on("mouseout", d => vis.removeHighlighting(d))
            .transition()
            .style("visibility", d => { return vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden" })
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.fqn) ? 0.5 : 1);

        // vis.level2Rects.exit().remove()

        // methods
        // console.log(vis.boxesToDraw.filter(d => d.type == vis.level2));
        // now we don't even need this since those boxes are guaranteed to be inside
        vis.level3Groups = vis.boxArea.selectAll(".level3Group").data(vis.boxesToDraw.filter(d => d.type == vis.level3), d => d.type + d.fqn);
        vis.level3Groups = vis.level3Groups.enter().append("g").attr("class", "level3Group").merge(vis.level3Groups);

        vis.level3Rects = vis.level3Groups.selectAll("rect").data(d => [d]);
        vis.level3Rects = vis.level3Rects.enter()
            .append("rect")
            .attr("class", "level3-box")
            .merge(vis.level3Rects)
            .attr("class", "level3-box " + getLevelClass(vis))
            .attr("width", d => {
                return d.name == undefined ? 
                    vis.smallestBoxWidth : 
                    (Math.max(d.name.split("\n").map(s => s.length)) + this.methodSuffix.length) * 3.1
            })
            .attr("height", vis.smallestBoxHeight)
            .style("fill", d => isLevel3(vis) ? vis.getColour(d.group) : "none")
            .on("mouseover", d => vis.addHighlighting(d))
            .on("mouseout", d => vis.removeHighlighting(d))
            .on("click", vis.onClick)
            .transition()
            .style("visibility", d => { return vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden" })
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.fqn) ? 0.5 : 1);
    }

    renderEntityText() {
        let vis = this;

        var texts = vis.boxGroups.selectAll("text").data(d => [d]);
        texts.enter().append("text")
            .merge(texts)
            .attr("class", (vis.viewLevel == vis.level2 || vis.viewLevel == vis.level3 ? "zoomed-in-pkg" : "not-zoomed-in-pkg"))
            .attr("class", "package-name-text")
            .attr("dx", 12)
            .attr("dy", "1em")
            .text(d => d.fqn)
            .style("visibility", d => vis.view == "default" || d.views.includes(vis.view) ? (vis.classesOnly ? "hidden" : "visible") : "hidden")
            .style("opacity", d => !vis.currentlyHighlighted.includes(d.type + d.fqn) ? 0.5 : 1);

        texts.exit().remove();

        vis.level2Texts = vis.level2Groups.selectAll("text").data(d => [d]);
        vis.level2Texts = vis.level2Texts.enter().append("text")
            .merge(vis.level2Texts)
            .attr("class", "class-name-text")
            .attr("dx", 12)
            .attr("dy", "1em")
            .attr("class", (vis.viewLevel == vis.level3 ? "zoomed-in-class" : "not-zoomed-in-class"))
            // .transition()
            .text(d => vis.viewLevel == vis.level1 ? "" : d.name)
            .style("visibility", d => vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden")
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.fqn) ? 0.5 : 1);
        vis.level2Texts.exit().remove();

        var level3Texts = vis.level3Groups.selectAll(".title-text").data(d => [d]);
        level3Texts = level3Texts.enter().append("text")
            .attr("class", "title-text")
            .merge(level3Texts)
            .attr("dx", 1)
            .attr("dy", "0.8em")
            .attr("dominant-baseline", "hanging")
            // .transition()
            .text(d => vis.viewLevel == vis.level3 ? d.name + vis.methodSuffix : "")
            .style("visibility", d => vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden")
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.fqn) ? 0.5 : 1);
        vis.level2Texts.exit().remove();

        var level3BodyTexts = vis.level3Groups.selectAll(".body-text").data(d => d.text == undefined ? [] : d.text.split("\n").map(t => { return { text: t, views: d.views, id: d.type + d.fqn } }));
        level3BodyTexts = level3BodyTexts.enter().append("text")
            .attr("class", "body-text")
            .merge(level3BodyTexts)
            .attr("dx", 6)
            .attr("dy", (d, i) => `${5 + i * 1}em`)
            // .transition()
            .text(d => vis.viewLevel == vis.level3 ? d.text : "")
            .style("visibility", d => { return vis.view == "default" || d.views.includes(vis.view) ? "visible" : "hidden" })
            .style("opacity", d => vis.currentlyHighlighted.length != 0 && !vis.currentlyHighlighted.includes(d.fqn) ? 0.5 : 1);

        vis.level2Texts.exit().remove();
    }

    renderLinks() {
        let vis = this;
        vis.links = vis.linkArea.selectAll("line").data(vis.linksToDraw, d => { vis.viewLevel == vis.level1 ? d.source.fqn + d.target.fqn : d.source + d.target });
        vis.links = vis.links.join("line")
            .attr("class", "link")
            .attr("stroke-width", d => d.value)
            .attr("stroke-opacity", d => !vis.linksHighlighted.includes(d) && vis.linksHighlighted.length != 0 ? 0.5 : 0.9)
            .on("dblclick", d => vis.autoPan(d));

        vis.links.exit().remove();
    }

    render() {
        let vis = this;
        vis.renderEntityBoxes();
        vis.renderEntityText();
        vis.renderLinks();

        vis.applyForceSimulations();
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
                if (d === undefined) {
                    console.log("d undefined");
                }
                let level2 = vis.boxData.find(box => box.fqn == d.container && box.type == vis.level2);
                if (level2 === undefined) {
                    console.log("level2 undefined", level2);
                    console.log("d", d);
                }

                let width = level2.x + vis.smallBoxWidth - vis.smallestBoxWidth;
                let height = level2.y + vis.smallBoxHeight - vis.smallestBoxHeight;

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

        } else if (vis.viewLevel == vis.level2) {
            vis.links
                .attr("x1", d => { let found = vis.boxData.find(data => d.source == data.fqn); return found == undefined ? 0 : found.x + vis.defaultClassWidth / 2})
                .attr("y1", d => { let found = vis.boxData.find(data => d.source == data.fqn); return found == undefined ? 0 : found.y + vis.defaultClassHeight / 2})
                .attr("x2", d => { let found = vis.boxData.find(data => d.target == data.fqn); return found == undefined ? 0 : found.x })
                .attr("y2", d => { let found = vis.boxData.find(data => d.target == data.fqn); return found == undefined ? 0 : found.y })
                .style("visibility", d => vis.view == "default" || (vis.boxData.find(data => d.source == data.fqn).views.includes(vis.view)
                    && vis.boxData.find(data => d.target == data.fqn).views.includes(vis.view)) ? "visible" : "hidden")
        } else {
            vis.links
                .attr("x1", d => { let found = vis.boxData.find(data => d.source == data.fqn); return found == undefined ? 0 : found.x})
                .attr("y1", d => { let found = vis.boxData.find(data => d.source == data.fqn); return found == undefined ? 0 : found.y})
                .attr("x2", d => { let found = vis.boxData.find(data => d.target == data.fqn); return found == undefined ? 0 : found.x })
                .attr("y2", d => { let found = vis.boxData.find(data => d.target == data.fqn); return found == undefined ? 0 : found.y })
                .style("visibility", d => vis.view == "default" || (vis.boxData.find(data => d.source == data.fqn).views.includes(vis.view)
                    && vis.boxData.find(data => d.target == data.fqn).views.includes(vis.view)) ? "visible" : "hidden")
        }

    }

    changeViewLevel() {
        let vis = this;

        var viewThreshold = vis.transitionPoints[0];
        var viewThresholdlevel3 = vis.transitionPoints[1];

        if (vis.zoomLevel >= viewThreshold && vis.zoomLevel <= viewThresholdlevel3 && vis.viewLevel != vis.level2) {
            vis.level1Simulation.stop();

            vis.viewLevel = vis.level2;
            vis.update();
            vis.updateLinks();
            return true;


        } else if (vis.zoomLevel <= viewThreshold && vis.viewLevel != vis.level1) {
            vis.level1Simulation.stop();

            vis.viewLevel = vis.level1;
            vis.update();
            vis.updateLinks();
            return true;

        } else if (vis.zoomLevel >= viewThresholdlevel3 && vis.viewLevel != vis.level3) {
            vis.level1Simulation.stop();

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

    centerOn(filePath) {
        let vis = this;
        vis.zoomLevel = 1;
        vis._centerOn(vis.boxData.find(b => b.filePath == filePath));
    }

    _centerOn(destination) {
        console.log({ name: destination.name, x: destination.x, y: destination.y })
        let vis = this;
        let boxWidth = (destination.type == vis.level1) ? vis.boxWidth : ((destination.type == vis.level2) ? vis.smallBoxWidth : vis.smallestBoxWidth); //destination.width// / vis.zoomLevel;
        let boxHeight = (destination.type == vis.level1) ? vis.boxHeight : ((destination.type == vis.level2) ? vis.smallBoxHeight : vis.smallestBoxHeight);//destination.height// / vis.zoomLevel;
        // TODO methods will look slightly off-centre width-wise due to their variable width
        let scaledWidth = (vis.width / 2) / vis.zoomLevel - (boxWidth / 2) /// vis.zoomLevel
        let scaledHeight = (vis.height / 2) / vis.zoomLevel - (boxHeight / 2) /// vis.zoomLevel
        console.log({width: scaledWidth, height: scaledHeight})
        let nx = destination.x * -1 + scaledWidth//vis.windowX;
        let ny = destination.y * -1 + scaledHeight //+ vis.windowY;

        console.log(vis.zoomLevel);


        var transform = d3.zoomIdentity.scale(vis.zoomLevel).translate(nx, ny);
        // vis.visArea.attr('transform', `translate(${nx}, ${ny}) scale(${vis.zoomLevel})`);
        vis.svg.call(vis.zoom.transform, transform)
        //vis.render();
    }

    autoPan = (link) => {
        let vis = this;

        let sourceInWindow = vis.boxesToDraw.find(x => x.fqn == link.source || x.signature == link.source)
        let targetInWindow = vis.boxesToDraw.find(x => x.fqn == link.target || x.signature == link.target);

        if (sourceInWindow != undefined) {
            if (targetInWindow != undefined) {
                console.log(link)
                console.log(vis.boxesToDraw)
                // do nothing, we can't determine the destination
                return;
            }

            vis._centerOn(vis.boxData.find(x => x.fqn == link.target || x.signature == link.target))

        } else {
            if (targetInWindow != undefined) {
                vis._centerOn(vis.boxData.find(x => x.fqn == link.source || x.signature == link.source));
            }
        }
    }

    onClick = (event, item) => {
        // TODO: Hoist items above their siblings to view unobstructed 
        let vis = this;

        if ((event.ctrlKey || event.metaKey) && item.type == vis.level2) {
            vis.classOnClick(item)
        } else {
            if (vis.performanceMode) {
                // vis.linkData.forEach(x => x.highlighted = false);
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
        if (!vis.clickedNodes.includes(item)) {
            vis.linksToDraw = vis.linksToDraw.concat(item.sourceOf);
            vis.clickedNodes.push(item);
        } else {
            console.log(vis.linksToDraw)
            vis.linksToDraw = vis.linksToDraw.filter(link => !item.sourceOf.includes(link))
            vis.clickedNodes = vis.clickedNodes.filter(node => node.fqn != item.fqn)
        }
        // vis.linksToDraw = item.sourceOf;
    }

    addHighlighting(item) {
        let vis = this;

        if (!vis.highlightingEnabled) {
            vis.currentlyHighlighted = [item.fqn];
            // vis.boxesToDraw.filter(b => b != item.fqn).addClass('deselected')
            vis.render();
            vis.updateLinks();
            return;
        };

        let highlight = vis.findConnected({ nodes: [], links: [] }, [item.fqn]);
        vis.currentlyHighlighted = highlight.nodes;
        vis.linksHighlighted = highlight.links;
        console.log(vis.currentlyHighlighted)

        vis.render();
        vis.updateLinks();
    }

    removeHighlighting() {

        let vis = this;
        if (!vis.highlightingEnabled) {
            vis.currentlyHighlighted = [];
            vis.render();
            vis.updateLinks();
            return;
        };
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

}
