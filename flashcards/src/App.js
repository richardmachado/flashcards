// src/App.js
import React, { useState, useEffect } from "react";
import "./App.css";
import AuthForm from "./AuthForm";
import HeaderBar from "./HeaderBar";
import ManageView from "./ManageView";
import StudyView from "./StudyView";


function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [userEmail, setUserEmail] = useState(
    localStorage.getItem("userEmail") || ""
  );
  const [isPro, setIsPro] = useState(
    JSON.parse(localStorage.getItem("isPro") || "false")
  );

  const [mode, setMode] = useState("login");
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
  const [transitionDir, setTransitionDir] = useState("none");

  // AI generation
  const [aiSourceText, setAiSourceText] = useState("");
  const [aiGeneratedCards, setAiGeneratedCards] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const [shuffledIndices, setShuffledIndices] = useState([]);
  const [isShuffled, setIsShuffled] = useState(false);

  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

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
    console.log("loadMe response:", data);

    if (!data.access_token) {
      throw new Error("No access token returned");
    }

    setToken(data.access_token);
    localStorage.setItem("token", data.access_token);

    await loadMe(data.access_token);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}

  const API_URL = process.env.REACT_APP_API_URL || 
  "http://localhost:4000";

  async function loadMe(authToken = token) {
  if (!authToken) return;

  try {
    const res = await fetch(`${API_URL}/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load user");

    setUserEmail(data.user?.email || "");
    setIsPro(!!data.user?.is_pro);
    localStorage.setItem("isPro", JSON.stringify(!!data.user?.is_pro));

    localStorage.setItem("userEmail", data.user?.email || "");
    localStorage.setItem("isPro", JSON.stringify(!!data.user?.is_pro));
  } catch (err) {
    console.error("loadMe error:", err.message);
  }
}


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

  useEffect(() => {
    if (token) {
      loadMe(token);
      loadDecks();
      loadCards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Reset to first card when deck changes / size changes
  const studyCards = cards.filter(
    (card) => !selectedDeckId || card.deck_id === selectedDeckId
  );

  useEffect(() => {
    setStudyIndex(0);
    setShowBack(false);
    setTransitionDir("none");
  }, [studyCards.length, selectedDeckId]);

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
      const newCards = Array.isArray(data.cards) ? data.cards : [];
      setAiGeneratedCards(newCards.map((c) => ({ ...c, selected: true })));
    } catch (err) {
      setAiError(err.message);
      setAiGeneratedCards([]);
    } finally {
      setAiLoading(false);
    }
  }

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

  function startStudy() {
    if (studyCards.length === 0) return;
    setStudyIndex(0);
    setShowBack(false);
    setTransitionDir("none");
    setIsShuffled(false);
    setShuffledIndices([]);
  }

  function startShuffle() {
    if (studyCards.length === 0) return;
    const indices = shuffleArray(studyCards.map((_, i) => i));
    setShuffledIndices(indices);
    setIsShuffled(true);
    setStudyIndex(0);
    setShowBack(false);
    setTransitionDir("none");
  }

  function stopShuffle() {
    if (!isShuffled || studyCards.length === 0) {
      setIsShuffled(false);
      setShuffledIndices([]);
      return;
    }

    const idx =
      shuffledIndices.length === studyCards.length
        ? shuffledIndices[studyIndex]
        : studyIndex;

    setIsShuffled(false);
    setShuffledIndices([]);
    setStudyIndex(idx);
    setShowBack(false);
    setTransitionDir("none");
  }

  function nextCard() {
    if (studyCards.length === 0) return;
    setShowBack(false);
    setStudyIndex((prev) => (prev + 1) % studyCards.length);
    setTransitionDir("right");
    setTimeout(() => setTransitionDir("none"), 260);
  }

  function prevCard() {
    if (studyCards.length === 0) return;
    setShowBack(false);
    setStudyIndex((prev) => (prev - 1 + studyCards.length) % studyCards.length);
    setTransitionDir("left");
    setTimeout(() => setTransitionDir("none"), 260);
  }

  function flipCard() {
    setShowBack((prev) => !prev);
  }

  async function handleUpgrade() {
    try {
      const res = await api("/billing/create-checkout-session", {
        method: "POST",
      });
      if (!res.url) throw new Error("No checkout URL returned");
      window.location.href = res.url;
    } catch (err) {
      alert(err.message);
    }
  }

  function handleLogout() {
    setToken("");
    setUserEmail("");
    setIsPro(false);
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("isPro");
    setCards([]);
    setView("manage");
  }

  const anySelected = aiGeneratedCards.some((c) => c.selected);

  const currentIndex =
    isShuffled && shuffledIndices.length === studyCards.length
      ? shuffledIndices[studyIndex]
      : studyIndex;

  const currentCard = studyCards[currentIndex];

  // detect /billing/success redirect from Stripe
const path = window.location.pathname;

if (path === "/billing/success") {
  return (
    <div className="app-root">
      <h1 className="app-title">Flashcards</h1>
      <div className="card-block" style={{ textAlign: "center", padding: "2rem" }}>
        <h2 className="section-title">You're now Pro!</h2>
        <p className="muted-text">
          Your subscription is active. Click below to continue.
        </p>
        <button
          className="btn btn-primary"
          onClick={async () => {
            try {
              // refresh user pro status before going back
              const res = await fetch(`${API_URL}/auth/me`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              const data = await res.json();
              const userIsPro = !!data.user?.is_pro;
              setIsPro(userIsPro);
              localStorage.setItem("isPro", JSON.stringify(userIsPro));
            } catch (err) {
              console.error("Could not refresh pro status", err);
            }
            window.location.replace("/");
          }}
        >
          Go to app
        </button>
      </div>
    </div>
  );
}

if (path === "/billing/cancel") {
  return (
    <div className="app-root">
      <h1 className="app-title">Flashcards</h1>
      <div className="card-block" style={{ textAlign: "center", padding: "2rem" }}>
        <h2 className="section-title">Checkout cancelled</h2>
        <p className="muted-text">No charge was made.</p>
        <button
          className="btn btn-gray"
          onClick={() => window.location.replace("/")}
        >
          Back to app
        </button>
      </div>
    </div>
  );
}

  return (

    
    <div className="app-root">
      <h1 className="app-title">Flashcards</h1>

      {!token ? (
        <AuthForm
          mode={mode}
          setMode={setMode}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          error={error}
          loading={loading}
          onSubmit={handleAuth}
        />
      ) : (
        <>
          <HeaderBar
            userEmail={userEmail}
            isPro={isPro}
            onLogout={handleLogout}
            onUpgrade={handleUpgrade}
          />

          <div className="view-toggle">
            <button
              type="button"
              className={
                "btn btn-small " +
                (view === "manage" ? "btn-primary" : "btn-gray")
              }
              onClick={() => setView("manage")}
            >
              Manage cards
            </button>
            <button
              type="button"
              className={
                "btn btn-small " +
                (view === "study" ? "btn-primary" : "btn-gray")
              }
              onClick={() => {
                setView("study");
                startStudy();
              }}
            >
              Study mode
            </button>
          </div>

          {view === "manage" && (
            <ManageView
              decks={decks}
              selectedDeckId={selectedDeckId}
              setSelectedDeckId={setSelectedDeckId}
              onCreateDeck={async (name) => {
                await api("/decks", {
                  method: "POST",
                  body: JSON.stringify({ name }),
                });
                await loadDecks();
              }}
              cards={cards}
              front={front}
              back={back}
              setFront={setFront}
              setBack={setBack}
              loading={loading}
              error={error}
              onCreateCard={handleCreateCard}
              editingId={editingId}
              editFront={editFront}
              editBack={editBack}
              setEditFront={setEditFront}
              setEditBack={setEditBack}
              onStartEdit={startEdit}
              onSaveEdit={handleSaveEdit}
              onDeleteCard={handleDeleteCard}
              aiSourceText={aiSourceText}
              setAiSourceText={setAiSourceText}
              aiError={aiError}
              aiLoading={aiLoading}
              aiGeneratedCards={aiGeneratedCards}
              setAiGeneratedCards={setAiGeneratedCards}
              anySelected={anySelected}
              onGenerate={handleGenerateFromText}
              onSaveGenerated={handleSaveGeneratedCards}
              isPro={isPro}
            />
          )}

          {view === "study" && (
            <StudyView
              decks={decks}
              selectedDeckId={selectedDeckId}
              setSelectedDeckId={setSelectedDeckId}
              studyCards={studyCards}
              studyIndex={studyIndex}
              currentIndex={currentIndex}
              showBack={showBack}
              transitionDir={transitionDir}
              isShuffled={isShuffled}
              onPrev={prevCard}
              onNext={nextCard}
              onFlip={flipCard}
              onStartStudy={startStudy}
              onShuffle={startShuffle}
              onUnshuffle={stopShuffle}
              currentCard={currentCard}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;