/***************************************
 * Background.js
 * A simple wrapper that applies the 
 * passed themeColor as a full-page 
 * background and renders its children on top.
 ***************************************/
import React from "react";
import "./Background.css"; // optional extra styles

export default function Background({ themeColor, children }) {
  return (
    <div
      className="background-container"
      style={{
        // The big “mother” background color:
        backgroundColor: themeColor || "#ffffff",
        minHeight: "100vh",
        width: "100%"
      }}
    >
      {children}
    </div>
  );
}
