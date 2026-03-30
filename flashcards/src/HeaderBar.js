import React from "react";

function HeaderBar({ userEmail, onLogout }) {
  return (
    <div className="app-header">
      <div>
        Logged in as <strong>{userEmail}</strong>
      </div>
      <button className="btn btn-danger btn-small" onClick={onLogout}>
        Logout
      </button>
    </div>
  );
}

export default HeaderBar;