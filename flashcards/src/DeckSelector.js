import React from "react";

function DeckSelector({
  decks,
  selectedDeckId,
  setSelectedDeckId,
  onCreateDeck,
}) {
  async function handleCreateDeck(e) {
    e.preventDefault();
    const name = prompt("Deck name?");
    if (!name || !name.trim()) return;
    await onCreateDeck(name.trim());
  }

  return (
    <form className="card-block" onSubmit={handleCreateDeck}>
      <div className="card-block-header">
        <div className="card-block-title">Decks</div>
        <button type="submit" className="btn btn-success btn-small">
          + New deck
        </button>
      </div>
      <div className="form-field">
        <label>Current deck</label>
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
    </form>
  );
}

export default DeckSelector;