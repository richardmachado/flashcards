import React, { useState, useEffect } from "react";
import "./App.css";

const API_URL = "http://localhost:4000";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [userEmail, setUserEmail] = useState(
    localStorage.getItem("userEmail") || ""
  );

  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [cards, setCards] = useState([]);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  const [studyIndex, setStudyIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  const [view, setView] = useState("manage"); // "manage" | "study"

  const [transitionDir, setTransitionDir] = useState("none"); // "left" | "right" | "none"

  // AI generation state
  const [aiSourceText, setAiSourceText] = useState("");
  const [aiGeneratedCards, setAiGeneratedCards] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Helper: call backend
  async function api(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }
    return data;
  }

  // Signup or login
  async function handleAuth(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const path = mode === "login" ? "/auth/login" : "/auth/signup";
      const data = await api(path, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!data.access_token) {
        throw new Error("No access token returned");
      }

      setToken(data.access_token);
      setUserEmail(data.user?.email || email);
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("userEmail", data.user?.email || email);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Load decks
  async function loadDecks() {
    if (!token) return;
    try {
      const data = await api("/decks", { method: "GET" });
      setDecks(Array.isArray(data) ? data : []);
      if (!selectedDeckId && data.length > 0) {
        setSelectedDeckId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Load cards
  async function loadCards() {
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const data = await api("/cards", { method: "GET" });
      setCards(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Initial load when token changes
  useEffect(() => {
    if (token) {
      loadDecks();
      loadCards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Create a card (manual)
  async function handleCreateCard(e) {
    e.preventDefault();
    if (!front.trim() || !back.trim() || !selectedDeckId) return;
    setError("");
    setLoading(true);
    try {
      await api("/cards", {
        method: "POST",
        body: JSON.stringify({
          front,
          back,
          deck_id: selectedDeckId,
        }),
      });
      setFront("");
      setBack("");
      await loadCards();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Call backend AI route to generate cards
  async function handleGenerateFromText(e) {
    e.preventDefault();
    if (!aiSourceText.trim() || !selectedDeckId) return;

    setAiError("");
    setAiLoading(true);

    try {
      const data = await api("/ai/test-generate-cards", {
        method: "POST",
        body: JSON.stringify({ text: aiSourceText }),
      });

      const cards = Array.isArray(data.cards) ? data.cards : [];
      setAiGeneratedCards(cards.map((c) => ({ ...c, selected: true })));
    } catch (err) {
      setAiError(err.message);
      setAiGeneratedCards([]);
    } finally {
      setAiLoading(false);
    }
  }

  // Save selected generated cards into this deck
  async function handleSaveGeneratedCards() {
    const toSave = aiGeneratedCards.filter((c) => c.selected);
    if (!toSave.length || !selectedDeckId) return;

    setAiError("");
    setAiLoading(true);

    try {
      for (const card of toSave) {
        await api("/cards", {
          method: "POST",
          body: JSON.stringify({
            front: card.front,
            back: card.back,
            deck_id: selectedDeckId,
          }),
        });
      }

      setAiGeneratedCards([]);
      setAiSourceText("");
      await loadCards();
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  }

  // Delete card
  async function handleDeleteCard(id) {
    setError("");
    setLoading(true);
    try {
      await api(`/cards/${id}`, {
        method: "DELETE",
      });
      await loadCards();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(card) {
    setEditingId(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
  }

  // Save edited card
  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingId) return;

    setError("");
    setLoading(true);
    try {
      await api(`/cards/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({
          front: editFront,
          back: editBack,
        }),
      });
      setEditingId(null);
      setEditFront("");
      setEditBack("");
      await loadCards();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Study helpers (filtered by deck)
  const studyCards = cards.filter(
    (card) => !selectedDeckId || card.deck_id === selectedDeckId
  );

  function startStudy() {
    if (studyCards.length === 0) return;
    setStudyIndex(0);
    setShowBack(false);
    setTransitionDir("none");
  }

function nextCard() {
  if (studyCards.length === 0) return;
  setShowBack(false);

  setStudyIndex((prev) => (prev + 1) % studyCards.length);
  setTransitionDir("right");

  // Clear the animation class after it runs
  setTimeout(() => {
    setTransitionDir("none");
  }, 260);
}

function prevCard() {
  if (studyCards.length === 0) return;
  setShowBack(false);

  setStudyIndex((prev) => (prev - 1 + studyCards.length) % studyCards.length);
  setTransitionDir("left");

  setTimeout(() => {
    setTransitionDir("none");
  }, 260);
}

  function flipCard() {
    setShowBack((prev) => !prev);
  }

  // Logout
  function handleLogout() {
    setToken("");
    setUserEmail("");
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    setCards([]);
    setView("manage");
  }

  const anySelected = aiGeneratedCards.some((c) => c.selected);

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "system-ui",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Flashcards</h1>

      {!token ? (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <button
              onClick={() => setMode("login")}
              style={{
                marginRight: 8,
                padding: "0.4rem 0.8rem",
                background: mode === "login" ? "#2563eb" : "#eee",
                color: mode === "login" ? "white" : "black",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Log in
            </button>
            <button
              onClick={() => setMode("signup")}
              style={{
                padding: "0.4rem 0.8rem",
                background: mode === "signup" ? "#2563eb" : "#eee",
                color: mode === "signup" ? "white" : "black",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleAuth}>
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "block", marginBottom: 4 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: "100%", padding: 8 }}
              />
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "block", marginBottom: 4 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: "100%", padding: 8 }}
              />
            </div>
            {error && (
              <div style={{ color: "red", marginBottom: "0.75rem" }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.5rem 1rem",
                background: "#16a34a",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {loading ? "Loading..." : mode === "login" ? "Log in" : "Sign up"}
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* Header with user + logout */}
          <div
            style={{
              marginBottom: "1.0rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              Logged in as <strong>{userEmail}</strong>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: "0.4rem 0.8rem",
                background: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>

          {/* Simple nav for views */}
          <div style={{ marginBottom: "1rem" }}>
            <button
              type="button"
              onClick={() => setView("manage")}
              style={{
                marginRight: 8,
                padding: "0.4rem 0.8rem",
                background: view === "manage" ? "#2563eb" : "#e5e7eb",
                color: view === "manage" ? "white" : "black",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Manage cards
            </button>
            <button
              type="button"
              onClick={() => {
                setView("study");
                startStudy();
              }}
              style={{
                padding: "0.4rem 0.8rem",
                background: view === "study" ? "#2563eb" : "#e5e7eb",
                color: view === "study" ? "white" : "black",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Study mode
            </button>
          </div>

          {/* Manage view */}
          {view === "manage" && (
            <>
              {/* Create deck */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const name = prompt("Deck name?");
                  if (!name || !name.trim()) return;
                  try {
                    await api("/decks", {
                      method: "POST",
                      body: JSON.stringify({ name }),
                    });
                    await loadDecks();
                  } catch (err) {
                    setError(err.message);
                  }
                }}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <div style={{ fontWeight: 500 }}>Decks</div>
                  <button
                    type="submit"
                    style={{
                      padding: "0.3rem 0.7rem",
                      background: "#16a34a",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    + New deck
                  </button>
                </div>
                <div style={{ marginTop: 8 }}>
                  <label style={{ display: "block", marginBottom: 4 }}>
                    Current deck
                  </label>
                  <select
                    value={selectedDeckId}
                    onChange={(e) => setSelectedDeckId(e.target.value)}
                    style={{ width: "100%", padding: 8 }}
                  >
                    {decks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                      </option>
                    ))}
                  </select>
                </div>
              </form>

              {/* New card form */}
              <form
                onSubmit={handleCreateCard}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div style={{ marginBottom: "0.5rem" }}>
                  <label style={{ display: "block", marginBottom: 4 }}>
                    Deck
                  </label>
                  <select
                    value={selectedDeckId}
                    onChange={(e) => setSelectedDeckId(e.target.value)}
                    style={{ width: "100%", padding: 8 }}
                  >
                    {decks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                      </option>
                    ))}
                  </select>
                </div>

                <h2 style={{ marginBottom: "0.75rem" }}>New card</h2>

                <div style={{ marginBottom: "0.5rem" }}>
                  <label style={{ display: "block", marginBottom: 4 }}>
                    Front
                  </label>
                  <textarea
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                    rows={2}
                    style={{ width: "100%", padding: 8 }}
                  />
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <label style={{ display: "block", marginBottom: 4 }}>
                    Back
                  </label>
                  <textarea
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                    rows={2}
                    style={{ width: "100%", padding: 8 }}
                  />
                </div>
                {error && (
                  <div style={{ color: "red", marginBottom: "0.75rem" }}>
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  {loading ? "Saving..." : "Add card"}
                </button>
              </form>

              {/* AI generation */}
              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                <h2 style={{ marginBottom: "0.5rem" }}>
                  Generate cards with AI
                </h2>
                <p
                  style={{
                    fontSize: 14,
                    color: "#4b5563",
                    marginBottom: "0.5rem",
                  }}
                >
                  Paste your notes below, then click <strong>Generate</strong>.
                  Review the suggested cards and save them into the selected
                  deck.
                </p>

                <div style={{ marginBottom: "0.5rem" }}>
                  <label style={{ display: "block", marginBottom: 4 }}>
                    Source text for this deck
                  </label>
                  <textarea
                    value={aiSourceText}
                    onChange={(e) => setAiSourceText(e.target.value)}
                    rows={6}
                    style={{ width: "100%", padding: 8 }}
                    placeholder="Paste your lecture notes, textbook excerpt, etc..."
                  />
                </div>

                {aiError && (
                  <div style={{ color: "red", marginBottom: "0.5rem" }}>
                    {aiError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGenerateFromText}
                  disabled={aiLoading || !aiSourceText.trim()}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    marginBottom: "0.75rem",
                  }}
                >
                  {aiLoading ? "Generating..." : "Generate cards"}
                </button>

                {aiGeneratedCards.length > 0 && (
                  <>
                    <h3
                      style={{
                        marginTop: "0.75rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Preview generated cards ({aiGeneratedCards.length})
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gap: "0.5rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      {aiGeneratedCards.map((c, idx) => (
                        <div
                          key={idx}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 6,
                            padding: "0.5rem",
                            background: c.selected ? "#f9fafb" : "#f3f4f6",
                            opacity: c.selected ? 1 : 0.6,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 4,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                color: "#9ca3af",
                              }}
                            >
                              Card {idx + 1}
                            </div>
                            <label
                              style={{
                                fontSize: 12,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={c.selected}
                                onChange={() =>
                                  setAiGeneratedCards((prev) =>
                                    prev.map((card, i) =>
                                      i === idx
                                        ? { ...card, selected: !card.selected }
                                        : card
                                    )
                                  )
                                }
                              />
                              Include
                            </label>
                          </div>
                          <div
                            style={{ fontWeight: 600, marginBottom: 4 }}
                          >
                            {c.front}
                          </div>
                          <div style={{ color: "#4b5563" }}>{c.back}</div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveGeneratedCards}
                      disabled={aiLoading || !anySelected}
                      style={{
                        padding: "0.5rem 1rem",
                        background: anySelected ? "#16a34a" : "#9ca3af",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: anySelected ? "pointer" : "not-allowed",
                      }}
                    >
                      {aiLoading ? "Saving..." : "Save selected to deck"}
                    </button>
                  </>
                )}
              </div>

              {/* Your cards list */}
              <div>
                <h2 style={{ marginBottom: "0.75rem" }}>Your cards</h2>
                {loading && cards.length === 0 && <div>Loading...</div>}
                {cards.length === 0 && !loading && <div>No cards yet.</div>}
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: 8,
                        padding: "0.75rem",
                        background: "#f9fafb",
                      }}
                    >
                      {editingId === card.id ? (
                        <form onSubmit={handleSaveEdit}>
                          <div style={{ marginBottom: "0.5rem" }}>
                            <label
                              style={{
                                display: "block",
                                marginBottom: 4,
                              }}
                            >
                              Front
                            </label>
                            <textarea
                              value={editFront}
                              onChange={(e) =>
                                setEditFront(e.target.value)
                              }
                              rows={2}
                              style={{ width: "100%", padding: 8 }}
                            />
                          </div>
                          <div style={{ marginBottom: "0.5rem" }}>
                            <label
                              style={{
                                display: "block",
                                marginBottom: 4,
                              }}
                            >
                              Back
                            </label>
                            <textarea
                              value={editBack}
                              onChange={(e) =>
                                setEditBack(e.target.value)
                              }
                              rows={2}
                              style={{ width: "100%", padding: 8 }}
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={loading}
                            style={{
                              padding: "0.3rem 0.7rem",
                              marginRight: 8,
                              background: "#16a34a",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              cursor: "pointer",
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            style={{
                              padding: "0.3rem 0.7rem",
                              background: "#6b7280",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <>
                          <div
                            style={{
                              fontWeight: "bold",
                              marginBottom: 4,
                            }}
                          >
                            {card.front}
                          </div>
                          <div style={{ color: "#4b5563" }}>
                            {card.back}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginTop: 8,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                color: "#9ca3af",
                              }}
                            >
                              Deck: {card.deck_id}
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={() => startEdit(card)}
                                style={{
                                  padding: "0.2rem 0.6rem",
                                  marginRight: 6,
                                  background: "#2563eb",
                                  color: "white",
                                  border: "none",
                                  borderRadius: 4,
                                  cursor: "pointer",
                                  fontSize: 12,
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteCard(card.id)
                                }
                                style={{
                                  padding: "0.2rem 0.6rem",
                                  background: "#dc2626",
                                  color: "white",
                                  border: "none",
                                  borderRadius: 4,
                                  cursor: "pointer",
                                  fontSize: 12,
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Study view */}
        {/* Study view */}
{view === "study" && (
  <div
    style={{
      border: "1px solid #ddd",
      borderRadius: 8,
      padding: "1rem",
      marginBottom: "1.5rem",
    }}
  >
    <h2 style={{ marginBottom: "0.75rem" }}>Study mode</h2>

    <div style={{ marginBottom: "0.75rem" }}>
      <label style={{ display: "block", marginBottom: 4 }}>
        Deck to study
      </label>
      <select
        value={selectedDeckId}
        onChange={(e) => {
          setSelectedDeckId(e.target.value);
          setStudyIndex(0);
          setShowBack(false);
        }}
        style={{ width: "100%", maxWidth: 300, padding: 8 }}
      >
        <option value="">All decks</option>
        {decks.map((deck) => (
          <option key={deck.id} value={deck.id}>
            {deck.name}
          </option>
        ))}
      </select>
    </div>

    {studyCards.length === 0 ? (
      <div>
        Add some cards on the <strong>Manage cards</strong> page to
        start studying.
      </div>
    ) : (
      <>
        <div
          className="study-card-wrapper"
          style={{ marginBottom: "0.75rem" }}
        >
          <div
            className={
              "study-card" +
              (showBack ? " flip" : "") +
              (transitionDir !== "none" ? " slide-in" : "")
            }
            onClick={flipCard}
          >
            {/* Front */}
            <div className="study-card-face study-card-front">
              <div style={{ textAlign: "center" }}>
                <div className="study-card-face-header">
                  Card {studyIndex + 1} of {studyCards.length}
                </div>
                <div className="study-card-face-body">
                  {studyCards[studyIndex].front}
                </div>
              </div>
            </div>

            {/* Back */}
            <div className="study-card-face study-card-back">
              <div style={{ textAlign: "center" }}>
                <div className="study-card-face-header">
                  Card {studyIndex + 1} of {studyCards.length}
                </div>
                <div className="study-card-face-body">
                  {studyCards[studyIndex].back}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={prevCard}
            style={{
              padding: "0.4rem 0.8rem",
              background: "#e5e7eb",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Prev
          </button>
          <button
            type="button"
            onClick={flipCard}
            style={{
              padding: "0.4rem 0.8rem",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {showBack ? "Show front" : "Show back"}
          </button>
          <button
            type="button"
            onClick={nextCard}
            style={{
              padding: "0.4rem 0.8rem",
              background: "#e5e7eb",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Next
          </button>
          <button
            type="button"
            onClick={startStudy}
            style={{
              padding: "0.4rem 0.8rem",
              marginLeft: "auto",
              background: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Restart
          </button>
        </div>
      </>
    )}
  </div>
)}
          )
        </>
      )}
    </div>
  );
}

export default App;