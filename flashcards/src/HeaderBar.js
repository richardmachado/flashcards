import React from "react";

function HeaderBar({
  userEmail,
  onLogout,
  onUpgrade,
  isPro,
  onCancelSubscription,
  upgradeError,
}) {
  return (
    <div>
      <div className="app-header">
        <div className="app-header-email">
          <span className="app-header-label">Logged in as</span>{" "}
          <strong>{userEmail}</strong>
          {isPro && <span className="pro-badge">Pro</span>}
        </div>

        <div className="app-header-actions">
          {isPro && (
            <button
              className="btn btn-gray btn-small"
              onClick={onCancelSubscription}
            >
              Billing
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

      {upgradeError && (
        <div className="error-text" style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
          {upgradeError}
        </div>
      )}
    </div>
  );
}

export default HeaderBar;