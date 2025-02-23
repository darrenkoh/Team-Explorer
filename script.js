// Set dimensions and margins
const margin = { top: 20, right: 120, bottom: 20, left: 120 },
      width = 960 - margin.right - margin.left,
      height = 600 - margin.top - margin.bottom;

// Create SVG and main group
const svg = d3.select("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Create tree layout
const tree = d3.tree().size([height, width]);

// Define link generator (horizontal tree)
const diagonal = d3.linkHorizontal()
    .x(d => d.y)
    .y(d => d.x);

// Load JSON data
d3.json("data.json").then(data => {
    // Create hierarchy
    const root = d3.hierarchy(data);

    // Collapse function: hides children by moving them to _children
    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }

    // Collapse all nodes below the root (teams and their descendants)
    root.children.forEach(collapse);

    // Initialize positions for smooth transitions
    root.x0 = 0;
    root.y0 = 0;

    // Initial update
    update(root);

    // Update function to render the tree
    function update(source) {
        // Compute the new tree layout
        const treeData = tree(root);
        const nodes = treeData.descendants(),
              links = treeData.descendants().slice(1);

        // Normalize depth for fixed spacing
        nodes.forEach(d => {
            d.y = d.depth * 180;
        });

        // Nodes
        const node = svg.selectAll(".node")
            .data(nodes.filter(d => d.depth > 0), d => d.id || (d.id = ++i));

        // Enter new nodes
        const nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${source.y0},${source.x0})`)
            .on("click", click);

        nodeEnter.append("circle")
            .attr("r", 1e-6)
            .style("fill", d => {
                if (d.depth === 1) return "red";        // Teams
                if (d.depth === 2) return "blue";       // Projects
                if (d.depth === 3) return "green";      // Metadata
                return "#fff";
            })
            .style("fill-opacity", d => d._children ? 0.6 : 1);

        nodeEnter.append("text")
            .attr("x", d => d.children || d._children ? -13 : 13)
            .attr("dy", ".35em")
            .attr("text-anchor", d => d.children || d._children ? "end" : "start")
            .text(d => d.data.name)
            .style("fill-opacity", 1e-6);

        // Update nodes
        const nodeUpdate = nodeEnter.merge(node);

        nodeUpdate.transition()
            .duration(750)
            .attr("transform", d => `translate(${d.y},${d.x})`);

        nodeUpdate.select("circle")
            .attr("r", 4.5)
            .style("fill", d => {
                if (d.depth === 1) return "red";
                if (d.depth === 2) return "blue";
                if (d.depth === 3) return "green";
                return "#fff";
            })
            .style("fill-opacity", d => d._children ? 0.6 : 1);

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Exit nodes
        const nodeExit = node.exit().transition()
            .duration(750)
            .attr("transform", d => `translate(${source.y},${source.x})`)
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6);

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        // Links
        const link = svg.selectAll(".link")
            .data(links, d => d.id);

        // Enter new links
        const linkEnter = link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", d => {
                const o = { x: source.x0, y: source.y0 };
                return diagonal({ source: o, target: o });
            });

        // Update links
        const linkUpdate = linkEnter.merge(link);

        linkUpdate.transition()
            .duration(750)
            .attr("d", diagonal);

        // Exit links
        const linkExit = link.exit().transition()
            .duration(750)
            .attr("d", d => {
                const o = { x: source.x, y: source.y };
                return diagonal({ source: o, target: o });
            })
            .remove();

        // Store the old positions for transitions
        nodes.forEach(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // Click handler to toggle children
    let i = 0;
    function click(event, d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
        update(d);
    }
});