// src/StudyView.js
import React from "react";

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
}) {
  return (
    <div className="card-block">
      <h2 className="section-title">Study mode</h2>

      <div className="form-field form-field-inline">
        <label>Deck to study</label>
        <select
          value={selectedDeckId}
          onChange={(e) => {
            setSelectedDeckId(e.target.value);
          }}
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
        <div className="muted-text">
          Add some cards on the <strong>Manage cards</strong> page to start
          studying.
        </div>
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
            {/* use currentIndex instead of studyIndex */}
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
        "btn btn-small " + (isShuffled ? "btn-primary" : "btn-ghost")
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
    </div>
  );
}

export default StudyView;