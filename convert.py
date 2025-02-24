import base64
import json
import os

def generate_single_html(html_path, js_path, json_path, css_path, img_folder_path):
    """
    Generate a single HTML file with embedded CSS, JavaScript, JSON data, and images from a folder.

    Args:
        html_path (str): Path to the HTML file (e.g., 'index.html').
        js_path (str): Path to the JavaScript file (e.g., 'script.js').
        json_path (str): Path to the JSON data file (e.g., 'data.json').
        css_path (str): Path to the CSS file (e.g., 'style.css').
        img_folder_path (str): Path to the folder containing images (e.g., 'img').

    Returns:
        str: The content of the single HTML file with all resources embedded.

    Raises:
        ValueError: If the JavaScript code does not contain the expected d3.json call,
                    or if there are mismatched braces in the JavaScript code.
        FileNotFoundError: If any of the input files or images are not found.
    """
    # Read all file contents
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    with open(js_path, 'r', encoding='utf-8') as f:
        js_content = f.read()
    with open(json_path, 'r', encoding='utf-8') as f:
        json_content = f.read()
    with open(css_path, 'r', encoding='utf-8') as f:
        css_content = f.read()

    # Parse JSON
    json_data = json.loads(json_content)

    # Collect all unique image paths from JSON
    image_paths = set()

    def collect_images(node):
        """
        Recursively traverse the JSON node to collect all 'image' field values.

        Args:
            node (dict): The current JSON node to process.
        """
        if "image" in node:
            image_paths.add(node["image"])
        if "children" in node:
            for child in node["children"]:
                collect_images(child)

    collect_images(json_data)

    # Build image_map with base64 encoded images
    image_map = {}
    for image_path in image_paths:
        # Handle image paths that may start with "img/" prefix
        if image_path.startswith("img/"):
            relative_path = image_path[4:]  # Remove "img/" prefix
        else:
            relative_path = image_path
        actual_path = os.path.join(img_folder_path, relative_path)
        with open(actual_path, "rb") as f:
            img_data = f.read()
        img_base64 = base64.b64encode(img_data).decode("utf-8")
        base64_url = f"data:image/png;base64,{img_base64}"
        image_map[image_path] = base64_url

    # Replace image paths in JSON with base64 data URLs
    def replace_images(node):
        """
        Recursively traverse the JSON node to replace 'image' fields with base64 data URLs.

        Args:
            node (dict): The current JSON node to process.
        """
        if "image" in node:
            node["image"] = image_map[node["image"]]
        if "children" in node:
            for child in node["children"]:
                replace_images(child)

    replace_images(json_data)

    # Serialize modified JSON
    embedded_json = json.dumps(json_data)

    # Process JavaScript code to embed JSON data
    start_str = 'd3.json("data.json").then(function (data) {'
    start_index = js_content.find(start_str)
    if start_index == -1:
        raise ValueError("Could not find d3.json call in JavaScript code")

    # Extract preamble (code before d3.json call)
    preamble = js_content[:start_index]

    # Find the end of the then function
    opening_brace_index = start_index + len(start_str)
    brace_count = 1
    i = opening_brace_index
    while i < len(js_content) and brace_count > 0:
        if js_content[i] == '{':
            brace_count += 1
        elif js_content[i] == '}':
            brace_count -= 1
        i += 1
    if brace_count != 0:
        raise ValueError("Mismatched braces in JavaScript code")
    end_index = i - 1

    # Extract inner code (inside the then function)
    inner_code = js_content[opening_brace_index + 1:end_index].strip()

    # Construct modified JS content by embedding JSON data
    modified_js_content = preamble + f'var data = {embedded_json};\n' + inner_code

    # Embed CSS into HTML
    html_content = html_content.replace(
        '<link rel="stylesheet" href="style.css">',
        f'<style>{css_content}</style>'
    )

    # Embed JavaScript into HTML
    html_content = html_content.replace(
        '<script src="script.js"></script>',
        f'<script>{modified_js_content}</script>'
    )

    return html_content


single_html = generate_single_html(
    html_path='index.html',
    js_path='script.js',
    json_path='data.json',
    css_path='style.css',
    img_folder_path='img'
)

# Write the output to a file
with open('single.html', 'w', encoding='utf-8') as f:
    f.write(single_html)