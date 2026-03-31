// src/HeaderBar.js
import React from "react";

function HeaderBar({ userEmail, onLogout, onUpgrade, isPro }) {
  return (
    <div className="app-header">
      <div>
        Logged in as <strong>{userEmail}</strong>
        {isPro && <span> · Pro</span>}
      </div>
      {!isPro && (
        <button
          className="btn btn-primary btn-small"
          onClick={onUpgrade}
        >
          Go Pro
        </button>
      )}
      <button className="btn btn-danger btn-small" onClick={onLogout}>
        Logout
      </button>
    </div>
  );
}

export default HeaderBar;