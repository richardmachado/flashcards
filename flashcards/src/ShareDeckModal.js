import React, { useEffect, useState } from "react";

function ShareDeckModal({ deck, token, API_URL, onClose }) {
  const [email, setEmail] = useState("");
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingShares, setLoadingShares] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadShares() {
    try {
      setLoadingShares(true);
      const res = await fetch(`${API_URL}/decks/${deck.id}/shares`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load shares");
      }

      setShares(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingShares(false);
    }
  }

  useEffect(() => {
    loadShares();
  }, [deck.id, token, API_URL]);

  async function handleShare(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/decks/${deck.id}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          permission: "viewer",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to share deck");
      }

      setMessage("Deck shared successfully");
      setEmail("");
      await loadShares();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveShare(shareId) {
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/decks/${deck.id}/shares/${shareId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to remove share");
      }

      setShares((prev) => prev.filter((share) => share.id !== shareId));
      setMessage("Access removed");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="share-modal-header">
          <h3 id="share-modal-title">Share "{deck.name}"</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleShare} className="share-form">
          <label>Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
            required
          />

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Sharing..." : "Share deck"}
          </button>
        </form>

        {error && <div className="error-text">{error}</div>}
        {message && <div className="success-text">{message}</div>}

        <div className="share-list">
          <h4>Shared with</h4>

          {loadingShares ? (
            <p>Loading...</p>
          ) : shares.length === 0 ? (
            <p>No one has access yet.</p>
          ) : (
            shares.map((share) => (
              <div key={share.id} className="share-row">
                <div>
                  <div className="share-email">{share.email || "Unknown user"}</div>
                  <div className="share-permission">{share.permission}</div>
                </div>

                <button
                  type="button"
                  className="btn btn-gray btn-small"
                  onClick={() => handleRemoveShare(share.id)}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ShareDeckModal;