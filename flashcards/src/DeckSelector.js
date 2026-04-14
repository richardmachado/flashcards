import React, { useState } from "react";

function DeckSelector({
  decks,
  selectedDeckId,
  setSelectedDeckId,
  onCreateDeck,
  onShareDeck,
  onRenameDeck,
  onDeleteDeck,
}) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const selectedDeck = decks.find((d) => d.id === selectedDeckId);
  const isShared = selectedDeck?.shared === true;

  function startRename() {
    setRenameValue(selectedDeck?.name || "");
    setRenaming(true);
  }

  async function handleRename(e) {
    if (e?.preventDefault) e.preventDefault();
    if (!renameValue.trim()) return;
    await onRenameDeck(selectedDeckId, renameValue.trim());
    setRenaming(false);
  }
  async function handleDelete() {
    if (!selectedDeckId) return;
    const confirmed = window.confirm(
      `Delete "${selectedDeck?.name}"? This will also delete all cards in it.`
    );
    if (!confirmed) return;
    await onDeleteDeck(selectedDeckId);
  }

  return (
    <div className="card-block">
      <div className="card-block-header">
        <div className="card-block-title">Decks</div>
        <div className="card-block-actions">
          {!isShared && selectedDeckId && (
            <>
              {renaming ? (
                <>
                  <button
                    type="button"
                    className="btn btn-success btn-small"
                    onClick={handleRename}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn btn-gray btn-small"
                    onClick={() => setRenaming(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-gray btn-small"
                    onClick={startRename}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-small"
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                </>
              )}
            </>
          )}
          {!renaming && (
            <button
              type="button"
              className="btn btn-gray btn-small"
              disabled={!selectedDeckId || isShared}
              onClick={() => {
                const deck = decks.find((d) => d.id === selectedDeckId);
                if (deck && !deck.shared && onShareDeck) onShareDeck(deck);
              }}
            >
              Share
            </button>
          )}
          {!renaming && (
            <button
              type="button"
              className="btn btn-success btn-small"
              onClick={async () => {
                const name = prompt("Deck name?");
                if (!name || !name.trim()) return;
                await onCreateDeck(name.trim());
              }}
            >
              + New deck
            </button>
          )}
        </div>
      </div>

      <div className="form-field">
        <label>Current deck</label>
        {renaming ? (
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename(e);
              if (e.key === "Escape") setRenaming(false);
            }}
            autoFocus
          />
        ) : (
          <select
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(e.target.value)}
          >
            {decks.length === 0 ? (
              <option value="">No decks yet</option>
            ) : (
              decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.shared
                    ? `${deck.name} (shared by ${deck.shared_by_email || "someone"})`
                    : deck.name}
                </option>
              ))
            )}
          </select>
        )}
      </div>
    </div>
  );
}

export default DeckSelector;
