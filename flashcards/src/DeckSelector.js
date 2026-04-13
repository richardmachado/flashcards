import React from "react";

function DeckSelector({
  decks,
  selectedDeckId,
  setSelectedDeckId,
  onCreateDeck,
  onShareDeck,
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
  <div className="card-block-actions">
   <button
  type="button"
  className="btn btn-gray btn-small"
  disabled={!selectedDeckId}
  onClick={() => {
    const deck = decks.find((d) => d.id === selectedDeckId);
    if (deck && onShareDeck) onShareDeck(deck);
  }}
>
  Share
</button>
    <button type="submit" className="btn btn-success btn-small">
      + New deck
    </button>
  </div>
</div>
      <div className="form-field">
        <label>Current deck</label>
<select
  value={selectedDeckId}
  onChange={(e) => setSelectedDeckId(e.target.value)}
>
  {decks.length === 0 ? (
    <option value="">No decks yet</option>
  ) : (
    decks.map((deck) => (
      <option key={deck.id} value={deck.id}>
        {deck.name}
      </option>
    ))
  )}
</select>
      </div>
    </form>
  );
}

export default DeckSelector;