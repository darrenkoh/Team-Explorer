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

    // Function to calculate node radius based on its properties
    function getNodeRadius(d) {
        if (d.data.image) {
            var imageSize = d.data.imageSize || 20;
            var circleRadius = d.data.circleRadius || (imageSize / 2) + 2;
            return Math.max(circleRadius, imageSize / 2);
        } else {
            return d.data.nodeRadius || 5;
        }
    }

    // Function to estimate text width based on content
    function estimateTextWidth(text) {
        return text.length * 6; // Rough estimate: 6px per character
    }

    // Function to update the visualization
    function update() {
        // Get visible nodes and links
        var nodes = root.descendants().filter(function (d) {
            return d.parent ? d.parent.children : true;
        });
        var links = root.links().filter(function (d) {
            return d.source.children && d.target.parent.children;
        });

        // Organize nodes by parent for radial layout
        var nodesByParent = {};
        nodes.forEach(function(node) {
            if (node.parent) {
                var parentId = node.parent.id;
                if (!nodesByParent[parentId]) {
                    nodesByParent[parentId] = [];
                }
                nodesByParent[parentId].push(node);
            }
        });

        // Apply initial positions in a radial layout
        Object.keys(nodesByParent).forEach(function(parentId) {
            var childNodes = nodesByParent[parentId];
            var parent = nodes.find(n => n.id == parentId);
            
            // Skip if parent position is not yet defined
            if (!parent.x || !parent.y) return;
            
            var angleStep = 2 * Math.PI / childNodes.length;
            var radius = 100 + (childNodes.length * 10); // Adjust radius based on number of children
            
            childNodes.forEach(function(child, i) {
                var angle = i * angleStep;
                // Set initial positions in a circle around parent
                child.x = parent.x + radius * Math.cos(angle);
                child.y = parent.y + radius * Math.sin(angle);
            });
        });

        // Update simulation with visible nodes
        simulation.nodes(nodes);
        simulation.force("link").links(links);
        
        // Add collision detection to prevent node overlap
        simulation.force("collision", d3.forceCollide().radius(function(d) {
            // Calculate radius based on node properties
            var baseRadius = d.data.image ? (d.data.circleRadius || 20) : 10;
            // Add extra padding for nodes with children (clusters)
            var clusterPadding = d.children ? 40 : 20;
            return baseRadius + clusterPadding;
        }).strength(0.8));
        
        // Add radial forces to maintain the circular arrangement
        simulation.force("radial", d3.forceRadial(function(d) {
            // Only apply to nodes with parents
            if (!d.parent) return 0;
            
            var siblings = nodesByParent[d.parent.id] || [];
            return 100 + (siblings.length * 10); // Same radius calculation as above
        }, function(d) {
            return d.parent ? d.parent.x : width / 2;
        }, function(d) {
            return d.parent ? d.parent.y : height / 2;
        }).strength(0.3));
        
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
                // Create a clickable link without showing the URL
                var a = nodeGroup.append("a")
                    .attr("xlink:href", d.data.value)
                    .attr("target", "_blank");
                
                // Add a visible text showing only the name (not the URL)
                a.append("text")
                    .attr("x", effectiveRadius + 5)
                    .attr("y", 3)
                    .text(d.data.name)
                    .attr("class", "link-text");
                    
                // Add a small icon or indicator to show it's a link with better spacing
                a.append("text")                    
                    .attr("y", 3)
                    .attr("class", "link-icon");
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
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2));

    // Assign unique IDs to nodes for the simulation
    root.descendants().forEach(function (d, i) {
        d.id = i;
    });

    // Set initial position for the root node
    root.x = width / 2;
    root.y = height / 2;

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