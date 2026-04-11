// src/HeaderBar.js
import React from "react";
import "./HeaderBar.css";

function HeaderBar({
  userEmail,
  onLogout,
  onUpgrade,
  isPro,
  onCancelSubscription,
}) {
  return (
    <div className="app-header">
      <div>
        Logged in as <strong>{userEmail}</strong>
        {isPro && <span> · Pro</span>}
      </div>

      <div className="app-header-actions">
        {isPro && (
          <button
            className="btn btn-gray btn-small"
            onClick={onCancelSubscription}
          >
            Manage Billing
          </button>
        )}

        {!isPro && (
          <button
            className="btn btn-primary btn-small"
            onClick={onUpgrade}
          >
            Go Pro
          </button>
        )}

        <button
          className="btn btn-danger btn-small"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default HeaderBar;
