// src/NewCardForm.js
import React from "react";

function NewCardForm({
  decks,
  selectedDeckId,
  setSelectedDeckId,
  front,
  back,
  setFront,
  setBack,
  loading,
  error,
  onSubmit,
}) {
  return (
    <form className="card-block" onSubmit={onSubmit}>
      <div className="form-field">
        <label>Deck</label>
        <select
          value={selectedDeckId}
          onChange={(e) => setSelectedDeckId(e.target.value)}
        >
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.name}
            </option>
          ))}
        </select>
      </div>

      <h2 className="section-title">New card</h2>

      <div className="form-field">
        <label>Front</label>
        <textarea
          rows={2}
          value={front}
          onChange={(e) => setFront(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label>Back</label>
        <textarea
          rows={2}
          value={back}
          onChange={(e) => setBack(e.target.value)}
        />
      </div>
      {error && <div className="error-text">{error}</div>}
      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? "Saving..." : "Add card"}
      </button>
    </form>
  );
}

export default NewCardForm;