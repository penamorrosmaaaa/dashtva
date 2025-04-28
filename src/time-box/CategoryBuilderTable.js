import React, { useState, useEffect } from "react";
import "./CategoryTreeFullScreen.css"; // import the CSS file

/**
 * A single node in the tree, rendered recursively.
 */
function CategoryNode({ node, onChange, onDelete, color }) {
  // node = { name, children: [] }
  // Start collapsed by default.
  const [expanded, setExpanded] = useState(false);
  const [localName, setLocalName] = useState(node.name || "");

  useEffect(() => {
    setLocalName(node.name || "");
  }, [node.name]);

  function handleNameChange(e) {
    const newName = e.target.value;
    setLocalName(newName);
    onChange({ ...node, name: newName });
  }

  function handleAddSubcategory() {
    const newChild = { name: "New Subcategory", children: [] };
    const updatedChildren = [...(node.children || []), newChild];
    onChange({ ...node, children: updatedChildren });
    // Expand the node when a new subcategory is added.
    setExpanded(true);
  }

  function handleChildChange(index, updatedChild) {
    const updatedChildren = [...(node.children || [])];
    updatedChildren[index] = updatedChild;
    onChange({ ...node, children: updatedChildren });
  }

  function handleChildDelete(index) {
    const updatedChildren = node.children.filter((_, i) => i !== index);
    onChange({ ...node, children: updatedChildren });
  }

  // Confirmation prompt for deletion.
  function handleDelete() {
    if (
      window.confirm(
        `Are you sure you want to delete the category "${localName}"?`
      )
    ) {
      onDelete();
    }
  }

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="category-node">
      <div className="category-node-header">
        {/* 
          Show a color bullet if 'color' is provided. 
          By default, we pass color only for main categories,
          but you can pass it to subcategories as well 
          if you want them to have bullets, too.
        */}
        {color && <div className="color-bullet" style={{ backgroundColor: color }} />}

        {hasChildren ? (
          <button
            className="toggle-button"
            // Use the same color for the toggle button
            style={{ backgroundColor: color }}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "−" : "+"}
          </button>
        ) : (
          <div className="toggle-button-placeholder" />
        )}
        
        <input
          type="text"
          value={localName}
          onChange={handleNameChange}
          placeholder="Category name"
        />
        <button onClick={handleDelete}>Delete</button>
        <button onClick={handleAddSubcategory}>Add Subcategory</button>
      </div>
      {expanded && hasChildren && (
        <div className="category-node-children">
          {node.children.map((child, index) => (
            <CategoryNode
              key={index}
              node={child}
              // Pass the same color down so subcategories match their main category
              color={color}
              onChange={(updatedChild) => handleChildChange(index, updatedChild)}
              onDelete={() => handleChildDelete(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Full-screen overlay for the category tree editor.
 */
export default function CategoryTreeFullScreen({
  initialTree = [],
  onSave,
  onCancel,
}) {
  const [tree, setTree] = useState([]);

  useEffect(() => {
    setTree(initialTree);
  }, [initialTree]);

  function handleNodeChange(index, updatedNode) {
    const newTree = [...tree];
    newTree[index] = updatedNode;
    setTree(newTree);
  }

  function handleNodeDelete(index) {
    const newTree = tree.filter((_, i) => i !== index);
    setTree(newTree);
  }

  function handleAddMainCategory() {
    const newNode = { name: "New Category", children: [] };
    setTree([...tree, newNode]);
  }

  function handleSave() {
    onSave(tree);
  }

  // A pastel color palette for the main categories.
  const mainCategoryColors = [
    "#FFB3BA", // pastel red
    "#FFDFBA", // pastel orange
    "#FFFFBA", // pastel yellow
    "#BAFFC9", // pastel green
    "#BAE1FF", // pastel blue
    "#E2BAFF", // pastel purple
  ];

  return (
    <div className="fullscreen-overlay">
      <h2>Category Tree Editor</h2>
      <div className="tree-container">
        {tree.map((node, index) => (
          <CategoryNode
            key={index}
            node={node}
            // Each main category gets a color from our palette
            color={mainCategoryColors[index % mainCategoryColors.length]}
            onChange={(updatedNode) => handleNodeChange(index, updatedNode)}
            onDelete={() => handleNodeDelete(index)}
          />
        ))}
      </div>
      <button className="add-main-category-button" onClick={handleAddMainCategory}>
        + Add Main Category
      </button>
      <div className="fullscreen-buttons">
        <button className="save-button" onClick={handleSave}>
          Save
        </button>
        <button className="cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
