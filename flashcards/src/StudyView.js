import React from "react";
import TestMode from "./TestMode";

function StudyView({
  decks,
  selectedDeckId,
  setSelectedDeckId,
  studyCards,
  studyIndex,
  currentIndex,
  showBack,
  transitionDir,
  isShuffled,
  onPrev,
  onNext,
  onFlip,
  onStartStudy,
  onShuffle,
  onUnshuffle,
  currentCard,
  studyMode,
  onStartQuiz,
  quizOptions,
  selectedAnswer,
  quizFeedback,
  onQuizAnswer,
  onNextQuiz,
  quizScore,
  quizCompleted,
  quizTotal,
  setStudyMode,
  API_URL,
  token,
}) {
  const canQuiz = studyCards.length >= 4;

  return (
    <div className="card-block">
      <h2 className="section-title">Study mode</h2>

      <div className="form-field form-field-inline">
        <label>Deck to study</label>
        <select
          value={selectedDeckId}
          onChange={(e) => setSelectedDeckId(e.target.value)}
        >
          <option value="">All decks</option>
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.shared
                ? `${deck.name} (shared by ${deck.shared_by_email || "someone"})`
                : deck.name}
            </option>
          ))}
        </select>
      </div>

      {studyCards.length === 0 ? (
        <div className="muted-text">
          Add some cards on the <strong>Manage cards</strong> page to start
          studying.
        </div>
      ) : (
        <>
          <div className="study-controls" style={{ marginBottom: "1rem" }}>
            <button
              type="button"
              className={
                "btn btn-small " +
                (studyMode === "flashcards" ? "btn-primary" : "btn-gray")
              }
              onClick={onStartStudy}
            >
              Flashcards
            </button>

            <button
              type="button"
              className={
                "btn btn-small " +
                (studyMode === "quiz" ? "btn-primary" : "btn-gray")
              }
              onClick={onStartQuiz}
              disabled={!canQuiz}
            >
              Quiz mode
            </button>

            <button
              type="button"
              className={
                "btn btn-small " +
                (studyMode === "test" ? "btn-primary" : "btn-gray")
              }
              onClick={() => setStudyMode("test")}
              disabled={studyCards.length === 0}
            >
              AI Test
            </button>
          </div>

          {!canQuiz && studyMode === "quiz" && (
            <div className="muted-text" style={{ marginBottom: "1rem" }}>
              Quiz mode requires at least 4 cards in this deck.
            </div>
          )}

          {studyMode === "test" ? (
            <TestMode
              studyCards={studyCards}
              API_URL={API_URL}
              token={token}
            />
          ) : studyMode === "quiz" ? (
            currentCard && quizOptions.length > 0 ? (
              <>
                <div
                  className="study-card-wrapper"
                  style={{ display: "block" }}
                >
                  <div
                    className="study-card-face-header"
                    style={{ marginBottom: "1rem" }}
                  >
                    Question {studyIndex + 1} of {studyCards.length}
                  </div>

                  <div
                    className="study-card"
                    style={{
                      cursor: "default",
                      minHeight: "auto",
                      transform: "none",
                    }}
                  >
                    <div
                      className="study-card-face study-card-front"
                      style={{
                        position: "relative",
                        transform: "none",
                        backfaceVisibility: "visible",
                      }}
                    >
                      <div className="study-card-inner">
                        <div className="study-card-face-body">
                          {currentCard.front}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "1.25rem" }}>
                  {quizOptions.map((option, idx) => {
                    const isCorrect = option === currentCard.back;
                    const isPicked = option === selectedAnswer;

                    let className = "btn btn-gray";
                    if (selectedAnswer && isCorrect) className = "btn btn-success";
                    if (selectedAnswer && isPicked && !isCorrect) {
                      className = "btn btn-danger";
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        className={className}
                        onClick={() => onQuizAnswer(option)}
                        disabled={!!selectedAnswer}
                        style={{
                          width: "100%",
                          marginBottom: "0.75rem",
                          textAlign: "left",
                        }}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {quizFeedback && (
                  <div
                    className="muted-text"
                    style={{ marginTop: "0.75rem", marginBottom: "1rem" }}
                  >
                    {quizFeedback}
                  </div>
                )}

                <div className="study-controls">
                  <button
                    type="button"
                    className="btn btn-primary btn-small"
                    onClick={onNextQuiz}
                    disabled={!selectedAnswer || quizCompleted}
                  >
                    {quizCompleted ? "Quiz finished" : "Next question"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-gray btn-small study-restart"
                    onClick={onStartQuiz}
                  >
                    Restart quiz
                  </button>
                </div>

                {quizCompleted && (
                  <div
                    className="quiz-result-box"
                    style={{
                      marginTop: "1.25rem",
                      padding: "1rem 1.25rem",
                      borderRadius: "8px",
                      border: "1px solid var(--border-subtle, #d0d7de)",
                      backgroundColor: "var(--bg-subtle, #f6f8fa)",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 600,
                        marginBottom: "0.25rem",
                      }}
                    >
                      Quiz finished
                    </div>
                    <div style={{ fontSize: "1.05rem", marginBottom: "0.25rem" }}>
                      You scored <strong>{quizScore}</strong> out of{" "}
                      <strong>{quizTotal}</strong>.
                    </div>
                    <div className="muted-text" style={{ fontSize: "0.95rem" }}>
                      {quizScore / Math.max(quizTotal, 1) >= 0.8
                        ? "Great job!"
                        : "Keep practicing and you'll improve!"}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="muted-text">
                Not enough unique answers in this deck for quiz mode.
              </div>
            )
          ) : (
            <>
              <div className="study-card-wrapper">
                <button
                  type="button"
                  onClick={onPrev}
                  className="study-nav-button"
                >
                  ⟨
                </button>

                {currentCard && (
                  <div
                    className={
                      "study-card" +
                      (showBack ? " flip" : "") +
                      (transitionDir !== "none" ? " slide-in" : "")
                    }
                    onClick={onFlip}
                  >
                    <div className="study-card-face study-card-front">
                      <div className="study-card-inner">
                        <div className="study-card-face-header">
                          Card {currentIndex + 1} of {studyCards.length}
                        </div>
                        <div className="study-card-face-body">
                          {currentCard.front}
                        </div>
                      </div>
                    </div>

                    <div className="study-card-face study-card-back">
                      <div className="study-card-inner">
                        <div className="study-card-face-header">
                          Card {currentIndex + 1} of {studyCards.length}
                        </div>
                        <div className="study-card-face-body">
                          {currentCard.back}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={onNext}
                  className="study-nav-button"
                >
                  ⟩
                </button>
              </div>

              <div className="study-controls">
                <button
                  type="button"
                  className={
                    "btn btn-small " +
                    (isShuffled ? "btn-primary" : "btn-ghost")
                  }
                  onClick={isShuffled ? onUnshuffle : onShuffle}
                >
                  {isShuffled ? "Shuffle On" : "Shuffle Off"}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  onClick={onFlip}
                >
                  {showBack ? "Show front" : "Show back"}
                </button>
                <button
                  type="button"
                  className="btn btn-gray btn-small study-restart"
                  onClick={onStartStudy}
                >
                  Restart
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default StudyView;