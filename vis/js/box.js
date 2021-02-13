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
        this.smallBoxWidth = this.boxWidth / 4;
        this.smallBoxHeight = this.boxHeight / 4;
        // this.colours = ["red", "blue", "yellow", "green"]
        this.colours = d3.schemePastel1;

        this.zoomBarHeight = 300;
        this.minZoom = 0.5;
        this.maxZoom = 10;
        this.zoomLevel = 1;

        // this.transitionPoints = [0.25];
        this.transitionPoints = [0.15];
        this.initialized = 0;

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

        vis.boxData = vis.data.packages.concat(vis.data.classes);

        // probably want to cross-reference much of 
        // Sherry's bubbleviz as I can
        // Filtering is something where we need to keep track of ids

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

        console.log(vis.classesByPackage);

        // let's add some buttons

         // charge function that is called for each node, creates repulsion between nodes
        // TODO tweak // taken directly from Sherry
        function charge() {
            return -Math.pow(vis.boxHeight, 2.2) * vis.forceStrength;
        }

        // maybe I could change initial position by 
        // setting is before we start the simulation?
        // TODO I only want to run the simulation ONCE. and I don't want to move 
        // items after the first time.
        // Also need simulation for classes INSIDE packages
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

        // let's also make simulations per class
        vis.perPkgSimulations = Object.keys(vis.classesByPackage).map(pkg => {
            var mapping = {};
            mapping.id = pkg;
            mapping.simFn = () => {
            var pkgInfo = vis.data.packages.find(p => p.id == pkg);
            console.log(pkgInfo.x + vis.boxWidth/2);

            return d3.forceSimulation()
            .velocityDecay(0.18)
            // .force("link", d3.forceLink(vis.linkData).id(d => d.id))
            // instead of vis.center.x we need the package
            // yeah, the package... doesn't have an x value... hm
            .force('x', d3.forceX().strength(vis.forceStrength).x(pkgInfo.x + vis.boxWidth / 2))
            .force('y', d3.forceY().strength(vis.forceStrength).y(pkgInfo.y + vis.boxHeight / 2))
            .force('charge', d3.forceManyBody().strength(() => -Math.pow(vis.smallBoxHeight, 2) * vis.forceStrength))
            // .force("charge", d3.forceManyBody())
            .force('collision', d3.forceCollide().radius(d => Math.sqrt(Math.pow(vis.smallBoxWidth / 2, 2) + Math.pow(vis.smallBoxHeight / 2, 2))/2))
            .force("center", d3.forceCenter(pkgInfo.x + vis.boxWidth/2, pkgInfo.y + vis.boxHeight / 2))
            .on('tick', () => vis.classTicked(vis));
            }
            mapping.cls = vis.classesByPackage[pkg];
            return mapping;
        });
        
        // vis.perPkgSimulations.forEach(sim => sim.sim.stop());

        console.log(vis.perPkgSimulations)

        vis.addZoomLevel();

        vis.update();
    }

    update() {
        let vis = this;

        // filter the data according to view level
        // and view, eventually


        if (this.viewLevel == "package") {
            vis.linkData = vis.data.packageLinks;
        } else {
            vis.linkData = vis.data.classLinks;
        }

        vis.render();
    }

    render() {
        let vis = this;
        // need to create 


        var zoom = d3.zoom()
        // only scale up, e.g. between 1x and 50x
        .scaleExtent([vis.minZoom, vis.maxZoom]);

        vis.svg
            // .on("wheel", function (d) {
            //     var direction = d3.event.wheelDelta < 0 ? 'down' : 'up';
            //     vis.changeViewLevel(direction);
            // });
            .call(zoom.on("zoom", function () {
                vis.visArea.attr("transform", d3.event.transform);
                vis.changeViewLevel();
                vis.zoomLevel = d3.event.transform.k;
                vis.updateZoomLevel();
                // also, after a certain threshold, we should change direction
                //scaleExtent

            }));

            
        console.log(vis.boxData);
        vis.boxGroupsSelect = vis.boxArea.selectAll("g").data(vis.boxData.filter(d => d.type == "package"), d => { return d.type + d.id });
        console.log(vis.boxGroups);
        console.log(vis.boxGroupsSelect);
        vis.boxGroups = vis.boxGroupsSelect.enter().append("g").attr("class", "boxgroups").merge(vis.boxGroupsSelect);

        // vis.boxGroupsSelect.exit().remove();


        var boxes = vis.boxGroups.selectAll("rect").data(d => [d]);

        // packages
        boxes.enter().append("rect")
            .attr("class", "box")
            .merge(boxes)
            .attr("width", vis.boxWidth)
            .attr("height", vis.boxHeight)
            // colour coded by group
            .style("fill", d => vis.viewLevel == "package" ? vis.colourScale(d.group) : "none")
            .style("stroke", d => vis.viewLevel == "package" ? "none" : vis.colourScale(d.group));
        console.log(boxes)
        // boxes.exit().remove();

        var classGroupsSelect = vis.boxArea.selectAll(".classGroup").data(vis.boxData.filter(d => d.type == "package"), d => { return d.type + d.id });
        // var classGroupsSelect = vis.boxGroups.selectAll("g").data(d => [d]);
        vis.classGroups = classGroupsSelect.enter().append("g").attr("class", "classGroup").merge(classGroupsSelect);

        // vis.classRects = vis.boxGroups.selectAll(".class-box").data(pkg => vis.boxData.filter(d => d.type == "class" && d.pkg == pkg.id), d => {console.log(d.type + d.id); return d.type + d.id} );
        // console.log(vis.boxGroups.selectAll("rect").data(pkg => { return vis.boxData.filter(d => d.type == "class" && d.pkg == pkg.id) }, d => d.index ));
        // console.log(vis.boxGroups);
        // console.log(vis.boxGroups.selectAll("g")); // WHY IS SELECTION EMPTY
        // console.log(classGroupsSelect);
        // console.log(vis.classGroups);
        // console.log(vis.classGroups.selectAll("rect"));
        // vis.classRects = vis.boxGroups.selectAll(".class-box").data(pkg => { console.log(vis.boxData.filter(d => d.type == "class" && d.pkg == pkg.id)); return vis.boxData.filter(d => d.type == "class" && d.pkg == pkg.id)}, d => d.index );
        vis.classRects = vis.classGroups.selectAll("rect").data(pkg => { console.log(vis.boxData.filter(d => d.type == "class" && d.pkg == pkg.id)); return vis.boxData.filter(d => d.type == "class" && d.pkg == pkg.id)}, d => d.type + d.id );
        // now for each class, I want to make a simulation
        // with packageForClasses or whatever
        vis.classRects = vis.classRects.enter()
        .append("rect")
        .attr("class", "class-box")
        .merge(vis.classRects)
        .attr("width", vis.smallBoxHeight)
        .attr("height", vis.smallBoxHeight)
        .style("fill", d => vis.viewLevel == "package" ? "none" : vis.colourScale(d.group));


        var texts = vis.boxGroups.selectAll("text").data(d => [d]);

        texts.enter().append("text")
            .merge(texts)
            .attr("dx", 12)
            .attr("dy", ".35em")
            .text(d => d.id);
        texts.exit().remove();

        vis.links = vis.linkArea.selectAll("line").data(vis.linkData, d => d.source + d.target);
        vis.links = vis.links.join("line")
            .attr("stroke-width", d => d.value)
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6);

        vis.links.exit().remove();

        //TODO: okay, links have to be part of the boxData... hmm...
        // so changing it probably won't work because it's inter-graph
        // oh, we may not want to restart here all the time...
        if (vis.initialized == 0) {
        vis.simulation.nodes(vis.boxData).restart()
        // this lower line is optional
        .force("link", d3.forceLink(vis.linkData).id(d => d.type + d.id));

        vis.initialized = 1;
        }
        
    }

    // todo why is there even a separation between the two? need to 
    // investigate forceSimulation more
    ticked(vis) {
        console.log("ticked getting called");
        console.log(vis.boxData)
        // console.log(vis.boxGroups)
        vis.boxGroups
        // vis.boxArea.selectAll(".boxgroups")
            .attr("transform", d => `translate(${d.x}, ${d.y})`);
        vis.boxGroups.exit().remove();

    
        // console.log(vis.links)
        vis.links
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
    }

    classTicked(vis) {

        // TODO why don't these retain their original positions????
        vis.classRects
        .attr("transform", d => 
        {
            // console.log(d); 
        // `translate(${Math.max(vis.smallBoxWidth, Math.min(vis.boxWidth - vis.smallBoxWidth, d.x))},
        // ${Math.max(vis.smallBoxHeight, Math.min(vis.boxHeight - vis.smallBoxHeight, d.y))})`);
        // need to un-transform... hmmm...
        return `translate(${d.x}, ${d.y})`});


        // do something like this to bound it according to the package
        // TODO figure out how to do the links... can they all be together in one?
        // .attr("cx", function(d) {
        //     return (d.x = Math.max(radius, Math.min(width - radius, d.x)));
        //   })
        //   .attr("cy", function(d) {
        //     return (d.y = Math.max(radius, Math.min(height - radius, d.y)));

        // are the links going to follow them around? oh... yes.
        // oksy, I need to set it so that

        // console.log(vis.links)
        // console.log(vis.boxData)
        
        vis.links
            .attr("x1", d => vis.boxData.find(data => d.source == (data.type + data.id)).x)
            .attr("y1", d => vis.boxData.find(data => d.source == (data.type + data.id)).y)
            .attr("x2", d => vis.boxData.find(data => d.target == (data.type + data.id)).x)
            .attr("y2", d => vis.boxData.find(data => d.target == (data.type + data.id)).y);
            // todo make sure they are really linked properly...
    }

    updateLinks() {
        let vis = this;

        // having links go across different force graphs seems a bit troublesome...
        // so this is a hacky workaround for now
        if (vis.viewLevel == "package") {
            vis.links
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
        } else {
        vis.links
            .attr("x1", d => vis.boxData.find(data => d.source == data.type + data.id).x)
            .attr("y1", d => vis.boxData.find(data => d.source == data.type + data.id).y)
            .attr("x2", d => vis.boxData.find(data => d.target == data.type + data.id).x)
            .attr("y2", d => vis.boxData.find(data => d.target == data.type + data.id).y)
        }
    }

    changeViewLevel(direction) {
        let vis = this;

        console.log(vis.data.packageLinks);
        console.log(vis.data.classLinks);

        // TODO hacky, need to fix this impl later for extensibility
        var viewThreshold = vis.transitionPoints[0] * (vis.maxZoom - vis.minZoom);
        
        if (vis.zoomLevel >= viewThreshold && vis.viewLevel == "package") {
                vis.simulation.stop();
                // vis.data.classes = vis.data.classes.map(cls => {
                //     var pkg = vis.data.packages.find(p => p.id == cls.pkg)
                //     cls.x = pkg.x;
                //     cls.y = pkg.y;
                //     return cls;
                // });
                
                vis.viewLevel = "class";
                console.log("changing to class!")

                // reset the sim

            
                vis.perPkgSimulations.forEach(sim => {
                    if (sim.sim == undefined) {
                    // now we need to create it, if it's the first time...
                        sim.sim = sim.simFn();
                        sim.sim.nodes(sim.cls).restart();
                    } else {
                        // sim.sim.alpha(0.1);
                        // sim.sim.nodes(sim.cls).restart();
                        // this.classTicked(vis);
                    }
                })

                vis.update();
                vis.updateLinks();

        } else if (vis.zoomLevel <= viewThreshold && vis.viewLevel == "class") {
            // TODO why do they jump so far back afterwards????
                vis.simulation.stop();
                console.log("changing to package!")

                vis.perPkgSimulations.forEach(sim => {
                    sim.sim.stop();
                })

                vis.viewLevel = "package";
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

        vis.zoomArea.append("rect")
        .attr("height", vis.zoomBarHeight)
        .attr("width", 50)
        .style("fill", "red");
        
        // add a bar that shows how zoomed-in we are
        // a rectangle with zoom level indications...
        // position the bar as an indicator of scale - zoom vs height

        vis.zoomArea.selectAll("line").data(vis.transitionPoints)
        .enter()
        .append("line")
        .attr("x1", 0)
        .attr("x2", 50)
        .attr("y1", d => vis.zoomBarHeight - vis.zoomScale(d * (vis.maxZoom - vis.minZoom)))
        .attr("y2", d => vis.zoomBarHeight - vis.zoomScale(d * (vis.maxZoom - vis.minZoom)))
        .style("stroke", "black");

        vis.updateZoomLevel();
    }

    updateZoomLevel() {
        let vis = this;

        let zoom = vis.zoomArea.selectAll("#zoom-level").data([vis.zoomLevel]);

        zoom.enter().append("line").attr("id", "zoom-level")
        .merge(zoom)
        .attr("x1", -5)
        .attr("x2", 55)
        .attr("y1", d => vis.zoomBarHeight - vis.zoomScale(d))
        .attr("y2", d => vis.zoomBarHeight - vis.zoomScale(d))
        .style("stroke", "green");
    }
}