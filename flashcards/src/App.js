import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import AuthForm from "./AuthForm";
import HeaderBar from "./HeaderBar";
import ManageView from "./ManageView";
import StudyView from "./StudyView";
import ShareDeckModal from "./ShareDeckModal";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

function App() {
  // Auth / user
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [userEmail, setUserEmail] = useState(
    localStorage.getItem("userEmail") || ""
  );
  const [isPro, setIsPro] = useState(
    JSON.parse(localStorage.getItem("isPro") || "false")
  );

  // Auth form
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Data
  const [cards, setCards] = useState([]);
  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");

  // Create / edit card
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  // UI / status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("manage");

  // Study
  const [studyIndex, setStudyIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [transitionDir, setTransitionDir] = useState("none");
  const [shuffledIndices, setShuffledIndices] = useState([]);
  const [isShuffled, setIsShuffled] = useState(false);

  // Quiz
  const [studyMode, setStudyMode] = useState("flashcards"); // "flashcards" | "quiz"
  const [quizOptions, setQuizOptions] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [quizFeedback, setQuizFeedback] = useState("");
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizTotal, setQuizTotal] = useState(0);

  // AI
  const [aiSourceText, setAiSourceText] = useState("");
  const [aiGeneratedCards, setAiGeneratedCards] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiGenerationsUsed, setAiGenerationsUsed] = useState(0);
  const [aiFreeLimit, setAiFreeLimit] = useState(3);

  //share deck
  const [shareDeck, setShareDeck] = useState(null);
  const [userId, setUserId] = useState(localStorage.getItem("userId") || "");

  //forgot password
  const [forgotMessage, setForgotMessage] = useState("");

  const [upgradeError, setUpgradeError] = useState("");

  //card difficulty filter
  const [hardOnly, setHardOnly] = useState(false);

  // ---------- helpers that don't depend on derived values ----------

  const shuffleArray = useCallback((arr) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, []);

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }

    try {
      setError("");
      setForgotMessage("");

      const data = await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      setForgotMessage(
        data.message || "If that email exists, a reset link has been sent."
      );
    } catch (err) {
      setError(err.message);
    }
  }

  const onCancelSubscription = async () => {
    try {
      setUpgradeError("");
      const data = await api("/billing/cancel", { method: "POST" });
      if (!data.url) throw new Error("No portal URL returned");
      window.location.href = data.url;
    } catch (err) {
      setUpgradeError(err.message);
    }
  };

  const buildQuizOptions = useCallback(
    (card, allCards) => {
      if (!card || allCards.length < 4) return [];

      const correct = card.back;

      const wrongAnswers = allCards
        .filter((c) => c.id !== card.id && c.back && c.back !== correct)
        .map((c) => c.back);

      const uniqueWrongAnswers = [...new Set(wrongAnswers)];

      if (uniqueWrongAnswers.length < 3) return [];

      const shuffledWrong = shuffleArray(uniqueWrongAnswers);
      const options = [correct, ...shuffledWrong.slice(0, 3)];

      return shuffleArray(options);
    },
    [shuffleArray]
  );

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

      const email = data.user?.email || "";
      const pro = !!data.user?.is_pro;
      const used = data.user?.ai_generations_used ?? 0;
      const limit = data.user?.ai_free_limit ?? 3;
      const uid = data.user?.id || "";

      setUserEmail(email);
      setIsPro(pro);
      setAiGenerationsUsed(used);
      setAiFreeLimit(limit);
      setUserId(uid);

      localStorage.setItem("userEmail", email);
      localStorage.setItem("isPro", JSON.stringify(pro));
    } catch (err) {
      console.error("loadMe error:", err.message);
    }
  }

  // ---------- derived values that depend on cards/decks ----------

  const studyCards = cards.filter((card) => {
    const inDeck = !selectedDeckId || card.deck_id === selectedDeckId;
    const passesFilter = !hardOnly || card.difficulty === 2;
    return inDeck && passesFilter;
  });

  const hasHardCards = cards.some(
    (c) =>
      (!selectedDeckId || c.deck_id === selectedDeckId) && c.difficulty === 2
  );

  const currentIndex =
    isShuffled && shuffledIndices.length === studyCards.length
      ? shuffledIndices[studyIndex]
      : studyIndex;

  const currentCard = studyCards[currentIndex];

  const aiRemaining = Math.max(0, aiFreeLimit - aiGenerationsUsed);
  const anySelected = aiGeneratedCards.some((c) => c.selected);

  // user can delete decks that were shared with them
  async function handleLeaveDeck(deckId) {
    await api(`/decks/${deckId}/leave`, { method: "DELETE" });
    setSelectedDeckId("");
    await loadDecks();
    await loadCards();
  }

  // ---------- quiz handlers (now can safely use studyCards/currentCard) ----------

  function handleStudyDeckChange(newDeckId) {
    setSelectedDeckId(newDeckId);

    if (studyMode !== "quiz") return;

    const nextStudyCards = cards.filter(
      (card) => !newDeckId || card.deck_id === newDeckId
    );

    setStudyIndex(0);
    setSelectedAnswer("");
    setQuizFeedback("");
    setQuizScore(0);
    setQuizCompleted(false);
    setQuizTotal(nextStudyCards.length);
    setShowBack(false);
    setTransitionDir("none");
    setIsShuffled(false);
    setShuffledIndices([]);

    if (nextStudyCards.length >= 4) {
      setQuizOptions(buildQuizOptions(nextStudyCards[0], nextStudyCards));
    } else {
      setQuizOptions([]);
    }
  }

  function startQuiz() {
    if (studyCards.length < 4) return;

    setStudyMode("quiz");
    setStudyIndex(0);
    setShowBack(false);
    setTransitionDir("none");
    setIsShuffled(false);
    setShuffledIndices([]);

    setSelectedAnswer("");
    setQuizFeedback("");
    setQuizScore(0);
    setQuizCompleted(false);
    setQuizTotal(studyCards.length);

    const firstCard = studyCards[0];
    setQuizOptions(buildQuizOptions(firstCard, studyCards));
  }

  function handleQuizAnswer(answer) {
    if (!currentCard || selectedAnswer || quizCompleted) return;

    setSelectedAnswer(answer);

    if (answer === currentCard.back) {
      setQuizFeedback("Correct!");
      setQuizScore((s) => s + 1);
    } else {
      setQuizFeedback(`Incorrect. Correct answer: ${currentCard.back}`);
    }
  }

  function nextQuizQuestion() {
    if (studyCards.length === 0 || !selectedAnswer) return;

    const isLastQuestion = studyIndex >= studyCards.length - 1;

    if (isLastQuestion) {
      setQuizCompleted(true);
      setQuizFeedback("");
      return;
    }

    const nextIndex = studyIndex + 1;
    const nextCard = studyCards[nextIndex];

    setStudyIndex(nextIndex);
    setSelectedAnswer("");
    setQuizFeedback("");
    setQuizOptions(buildQuizOptions(nextCard, studyCards));
  }

  function startStudy() {
    if (studyCards.length === 0) return;

    setStudyMode("flashcards");
    setStudyIndex(0);
    setShowBack(false);
    setTransitionDir("none");
    setIsShuffled(false);
    setShuffledIndices([]);

    // clear quiz UI so it doesn't show in flashcards
    setSelectedAnswer("");
    setQuizFeedback("");
    setQuizCompleted(false);
    setQuizScore(0);
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

  // ---------- auth / CRUD handlers ----------

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
      localStorage.setItem("token", data.access_token);

      await Promise.all([loadMe(data.access_token), loadDecks(), loadCards()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  async function handleCreateCard(e) {
    e.preventDefault();
    if (!front.trim() || !back.trim() || !selectedDeckId) return;

    setError("");
    setLoading(true);

    try {
      await api("/cards", {
        method: "POST",
        body: JSON.stringify({ front, back, deck_id: selectedDeckId }),
      });
      setFront("");
      setBack("");
      await loadCards();
    } catch (err) {
      setError(err.message); // will show the limit message inline
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

      if (typeof data.ai_generations_used === "number") {
        setAiGenerationsUsed(data.ai_generations_used);
      }
      if (typeof data.ai_free_limit === "number") {
        setAiFreeLimit(data.ai_free_limit);
      }
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

  async function handleSetDifficulty(cardId, difficulty) {
    try {
      await api(`/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ difficulty }),
      });
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, difficulty } : c))
      );
    } catch (err) {
      console.error("difficulty update error:", err);
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

  async function handleUpgrade() {
    try {
      setUpgradeError("");
      const res = await api("/billing/create-checkout-session", {
        method: "POST",
      });
      if (!res.url) throw new Error("No checkout URL returned");
      window.location.href = res.url;
    } catch (err) {
      setUpgradeError(err.message);
    }
  }

  async function handleRenameDeck(id, name) {
    await api(`/decks/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
    await loadDecks();
  }

  async function handleDeleteDeck(id) {
    await api(`/decks/${id}`, { method: "DELETE" });
    setSelectedDeckId("");
    await loadDecks();
    await loadCards();
  }

  async function handleCopyDeck(deckId, name) {
    await api(`/decks/${deckId}/copy`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    await loadDecks();
    await loadCards();
  }

  function handleLogout() {
    setToken("");
    setUserEmail("");
    setIsPro(false);
    setUserId("");
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("isPro");
    localStorage.removeItem("userId");
    setCards([]);
    setView("manage");
  }

  // ---------- effects ----------

  useEffect(() => {
    if (token) {
      loadMe(token);
      Promise.all([loadDecks(), loadCards()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    setStudyIndex(0);
    setShowBack(false);
    setTransitionDir("none");
  }, [studyCards.length, selectedDeckId]);

  // ---------- render ----------

  const path = window.location.pathname;

  if (path === "/billing/success") {
    return (
      <div className="app-root">
        <h1 className="app-title">Flashcards</h1>
        <div
          className="card-block"
          style={{ textAlign: "center", padding: "2rem" }}
        >
          <h2 className="section-title">You're now Pro!</h2>
          <p className="muted-text">
            Your subscription is active. Click below to continue.
          </p>
          <button
            className="btn btn-primary"
            onClick={async () => {
              try {
                await loadMe(token);
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
        <div
          className="card-block"
          style={{ textAlign: "center", padding: "2rem" }}
        >
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
      {!token ? (
        <div className="landing-page">
          <nav className="landing-nav">
            <div className="landing-logo">Study My Cards</div>
          </nav>

          <section className="landing-hero">
            <div className="landing-copy">
              <div className="landing-eyebrow">Built for college students</div>
              <h1 className="landing-title">
                Study smarter for your next exam
              </h1>
              <p className="landing-subtitle">
                Create flashcards, organize decks, quiz yourself, and turn notes
                into study material faster.
              </p>

              <div className="landing-points">
                <div>Organize material by class or exam</div>
                <div>Review with flashcards and quiz mode</div>
                <div>Generate cards from notes with AI</div>
                <div>Generate tests with AI to test your knowledge</div>
              </div>
            </div>

            <div className="landing-auth">
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
                onForgotPassword={handleForgotPassword}
                forgotMessage={forgotMessage}
              />
            </div>
          </section>

          <section className="landing-features">
            <div className="feature-card">
              <h3>Organize your classes</h3>
              <p>
                Create decks for each course, unit, or exam so your study
                material stays structured.
              </p>
            </div>

            <div className="feature-card">
              <h3>Study actively</h3>
              <p>
                Use flashcards and quiz mode to test recall instead of passively
                rereading notes.
              </p>
            </div>

            <div className="feature-card">
              <h3>Save time with AI</h3>
              <p>
                Turn source text into study cards faster when you need to review
                a lot of material.
              </p>
            </div>
          </section>

          <section className="landing-pricing">
            <h2>Start free</h2>
            <p>
              Use core study tools for free, then upgrade when you want more
              advanced features.
            </p>
          </section>

          <footer className="landing-footer">
            <p>Made for focused exam prep.</p>
          </footer>
        </div>
      ) : (
        <>
          <HeaderBar
            userEmail={userEmail}
            isPro={isPro}
            onLogout={handleLogout}
            onUpgrade={handleUpgrade}
            onCancelSubscription={onCancelSubscription}
            upgradeError={upgradeError}
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
                try {
                  await api("/decks", {
                    method: "POST",
                    body: JSON.stringify({ name }),
                  });
                  await loadDecks();
                } catch (err) {
                  setError(err.message); // will show the limit message inline
                }
              }}
              cards={cards}
              front={front}
              back={back}
              setFront={setFront}
              setBack={setBack}
              loading={loading}
              error={error}
              onCreateCard={handleCreateCard}
              onShareDeck={(deck) => setShareDeck(deck)}
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
              aiGenerationsUsed={aiGenerationsUsed}
              aiFreeLimit={aiFreeLimit}
              aiRemaining={aiRemaining}
              onUpgrade={handleUpgrade}
              currentUserId={userId}
              onRenameDeck={handleRenameDeck}
              onDeleteDeck={handleDeleteDeck}
              onLeaveDeck={handleLeaveDeck}
              onCopyDeck={handleCopyDeck}
            />
          )}

          {view === "study" && (
            <StudyView
              decks={decks}
              selectedDeckId={selectedDeckId}
              setSelectedDeckId={handleStudyDeckChange}
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
              studyMode={studyMode}
              onStartQuiz={startQuiz}
              quizOptions={quizOptions}
              selectedAnswer={selectedAnswer}
              quizFeedback={quizFeedback}
              onQuizAnswer={handleQuizAnswer}
              onNextQuiz={nextQuizQuestion}
              quizScore={quizScore}
              quizCompleted={quizCompleted}
              quizTotal={quizTotal}
              API_URL={API_URL}
              token={token}
              setStudyMode={setStudyMode}
              isPro={isPro}
              onUpgrade={handleUpgrade}
              hardOnly={hardOnly}
              setHardOnly={setHardOnly}
              hasHardCards={hasHardCards}
              onSetDifficulty={handleSetDifficulty}
              currentUserId={userId}
            />
          )}
          {shareDeck && (
            <ShareDeckModal
              deck={shareDeck}
              token={token}
              API_URL={API_URL}
              onClose={() => setShareDeck(null)}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
