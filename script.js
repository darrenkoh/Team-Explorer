// Define margins for the visualization
var margin = { top: 50, right: 50, bottom: 50, left: 50 };

// Load the data from data.json
d3.json("data.json").then(function (data) {
    // console.log("Loaded data:", data);

    // Create the hierarchy from the data
    var root = d3.hierarchy(data);

    // Initialize all nodes with _children set to children (for collapsing)
    root.descendants().forEach(function (d) {
        d._children = d.children ? d.children.slice() : null;  // Store a copy of children
        d.children = d._children;  // Initially expanded
    });

    // Function to update the visualization
    function update() {
        // Get visible nodes and links
        var nodes = root.descendants().filter(function (d) {
            return d.parent ? d.parent.children : true;
        });
        var links = root.links().filter(function (d) {
            return d.source.children && d.target.parent.children;
        });

        // Update simulation with visible nodes
        simulation.nodes(nodes);
        simulation.force("link").links(links);
        simulation.alpha(1).restart();

        // Update links with custom color and width
        var link = zoomGroup.selectAll(".link")
            .data(links, function (d) { return d.target.id; });
        link.exit().remove();
        var linkEnter = link.enter().append("line")
            .attr("class", "link")
            .on("click", function (event) {
                event.stopPropagation();  // Prevent zoom on edge click
            });

        // Merge enter and update selections to apply styles
        link.merge(linkEnter)
            .attr("stroke", function (d) { return d.source.data.edgeColor || "#ccc"; })
            .attr("stroke-width", function (d) { return d.source.data.edgeWidth || 2; });
        // Update nodes
        var node = zoomGroup.selectAll(".node")
            .data(nodes, function (d) { return d.id; });
        node.exit().remove();
        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .call(d3.drag()  // Enable dragging
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended))
            .on("click", function (event, d) {
                event.stopPropagation();  // Prevent zoom on node click
                toggleExpandCollapse(d);
            });

        // Append node elements (circles and images)
        nodeEnter.each(function (d) {
            var nodeGroup = d3.select(this);

            // Compute sizes based on node properties or defaults
            var imageSize = d.data.image ? (d.data.imageSize || 20) : null;
            var circleRadius = d.data.image ? (d.data.circleRadius || (imageSize / 2) + 2) : null;
            var circleColor = d.data.image ? (d.data.circleColor || d.data.color) : null;
            var nodeRadius = d.data.image ? null : (d.data.nodeRadius || 5);
            var effectiveRadius = d.data.image ? Math.max(circleRadius, imageSize / 2) : nodeRadius;

            if (d.data.image) {
                // Append circle around the image
                nodeGroup.append("circle")
                    .attr("r", circleRadius)
                    .attr("fill", circleColor)
                    .attr("stroke", d.data.color || "steelblue")
                    .attr("stroke-width", 2);

                // Create a clipPath for the image to ensure it stays within the circle
                var clipId = "clip-" + d.id;
                nodeGroup.append("clipPath")
                    .attr("id", clipId)
                    .append("circle")
                    .attr("r", circleRadius * 0.9); // Slightly smaller to ensure no edges show

                // Append image with clipPath
                nodeGroup.append("image")
                    .attr("xlink:href", d.data.image)
                    .attr("x", -circleRadius)
                    .attr("y", -circleRadius)
                    .attr("width", circleRadius * 2)
                    .attr("height", circleRadius * 2)
                    .attr("clip-path", "url(#" + clipId + ")")
                    .attr("preserveAspectRatio", "xMidYMid slice"); // This ensures the image is centered and cropped
            } else {
                // Append circle for nodes without images
                nodeGroup.append("circle")
                    .attr("r", nodeRadius)
                    .attr("fill", "white")
                    .attr("stroke", "steelblue")
                    .attr("stroke-width", 2);
            }

            // Append text labels
            if (!d.children && d.data.value && (d.data.value.startsWith("http://") || d.data.value.startsWith("https://"))) {
                var a = nodeGroup.append("a")
                    .attr("xlink:href", d.data.value)
                    .attr("target", "_blank");
                a.append("text")
                    .attr("x", effectiveRadius + 5)
                    .attr("y", 3)
                    .text(d.data.name + ": " + d.data.value);
            } else {
                nodeGroup.append("text")
                    .attr("x", effectiveRadius + 5)
                    .attr("y", 3)
                    .text(d.data.name + (d.data.value ? ": " + d.data.value : ""));
            }
        });

        // Update font weight based on expand/collapse state
        node.merge(nodeEnter).select("text")
            .style("font-weight", function (d) {
                return d._children && !d.children ? "bold" : "normal";  // Bold if collapsed
            });
    }

    // Function to toggle expand/collapse
    function toggleExpandCollapse(d) {
        if (d._children) {
            if (d.children) {
                // Collapse: hide children
                d.children = null;
            } else {
                // Expand: show children
                d.children = d._children.slice();  // Use a copy to preserve original
            }
            update();
        }
    }

    // Drag functions
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    // Set initial dimensions based on the window size
    var width = window.innerWidth;
    var height = window.innerHeight;

    // Create the SVG container
    var svg = d3.select("#tree").append("svg")
        .attr("width", width)
        .attr("height", height);

    // Create a group for zooming and panning
    var zoomGroup = svg.append("g");

    // Set up zoom behavior
    var zoom = d3.zoom().on("zoom", function (event) {
        zoomGroup.attr("transform", event.transform);
    });
    svg.call(zoom);

    // Set initial zoom transform to account for margins
    svg.call(zoom.transform, d3.zoomIdentity.translate(margin.left, margin.top));

    // Create the force simulation
    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function (d) { return d.id; }).distance(100))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2));

    // Assign unique IDs to nodes for the simulation
    root.descendants().forEach(function (d, i) {
        d.id = i;
    });

    // Initial update
    update();

    // Function to update layout on window resize
    function updateLayout() {
        width = window.innerWidth;
        height = window.innerHeight;
        svg.attr("width", width).attr("height", height);
        simulation.force("center", d3.forceCenter(width / 2, height / 2));
        simulation.alpha(1).restart();
    }

    // Add resize event listener
    window.addEventListener("resize", updateLayout);

    // Update positions on each tick of the simulation
    simulation.on("tick", function () {
        zoomGroup.selectAll(".link")
            .attr("x1", function (d) { return d.source.x; })
            .attr("y1", function (d) { return d.source.y; })
            .attr("x2", function (d) { return d.target.x; })
            .attr("y2", function (d) { return d.target.y; });

        zoomGroup.selectAll(".node")
            .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });
    });
});