# Organization Hierarchy Visualization

This project visualizes an organization hierarchy using D3.js, a powerful JavaScript library for producing dynamic, interactive data visualizations in web browsers. The hierarchy is represented in a force-directed graph, allowing users to explore the structure of the organization interactively.

## Project Structure

The project consists of the following files:

- `index.html`: The main HTML file that sets up the structure of the web page.
- `style.css`: The CSS file that styles the visualization and the web page.
- `script.js`: The JavaScript file that contains the logic for loading data, creating the visualization, and handling user interactions.
- `data.json`: The JSON file that contains the hierarchical data structure of the organization.

## Getting Started

### Prerequisites

To run this project, you need:

- A modern web browser (Chrome, Firefox, Safari, etc.)
- A local server (optional, but recommended for loading JSON files)

### Steps to Use

1. **Clone the Repository**: 
   Clone this repository to your local machine using the following command:
   ```bash
   git clone <repository-url>
   ```

2. **Navigate to the Project Directory**:
   Change into the project directory:
   ```bash
   cd organization-hierarchy-visualization
   ```

3. **Open `index.html`**:
   You can open `index.html` directly in your browser. However, if you encounter issues loading the `data.json` file, it's recommended to use a local server. You can use Python's built-in HTTP server for this:
   ```bash
   # For Python 3.x
   python -m http.server
   ```
   Then, navigate to `http://localhost:8000` in your web browser.

4. **Explore the Visualization**:
   - The organization hierarchy will be displayed as a force-directed graph.
   - Click on nodes to expand or collapse their children.
   - You can drag nodes to reposition them.
   - Use the mouse wheel to zoom in and out.

## File Descriptions

### `index.html`

This file contains the basic structure of the web page, including links to the CSS and JavaScript files. It sets up a `div` element with the ID `tree`, which is where the D3 visualization will be rendered.

### `style.css`

This file contains styles for the body, nodes, links, and text in the visualization. You can customize the appearance of the graph by modifying the styles defined here.

### `script.js`

This file contains the main logic for the visualization:
- It loads the hierarchical data from `data.json`.
- It creates a D3 force simulation to manage the layout of the nodes and links.
- It handles user interactions such as dragging nodes and expanding/collapsing nodes.

### `data.json`

This file contains the hierarchical data structure of the organization. You can modify this file to change the organization structure, team names, and other properties. The data is structured in a way that allows for nested children, representing teams and projects.

## Customization

You can customize the visualization by modifying the following:

- **Data**: Change the contents of `data.json` to reflect your organization's structure.
- **Styles**: Modify `style.css` to change the appearance of nodes, links, and text.
- **JavaScript Logic**: Update `script.js` to add new features or change the behavior of the visualization.

## License

This project is licensed under the MIT License. Feel free to use and modify it as needed.

## Acknowledgments

- [D3.js](https://d3js.org/) - The library used for creating the visualization.