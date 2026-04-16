import React, { useState } from "react";

function DeckSelector({
  decks,
  selectedDeckId,
  setSelectedDeckId,
  onCreateDeck,
  onShareDeck,
  onRenameDeck,
  onDeleteDeck,
  loading,
  onLeaveDeck,
}) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [createValue, setCreateValue] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const selectedDeck = decks.find((d) => d.id === selectedDeckId);
  const isShared = selectedDeck?.shared === true;
  const [confirmingLeave, setConfirmingLeave] = useState(false);

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

  async function handleCreate(e) {
    if (e?.preventDefault) e.preventDefault();
    if (!createValue.trim()) return;
    await onCreateDeck(createValue.trim());
    setCreateValue("");
    setCreating(false);
  }

  async function handleDelete() {
    await onDeleteDeck(selectedDeckId);
    setConfirmingDelete(false);
  }

const isEditing = renaming || creating || confirmingDelete || confirmingLeave;

  return (
    <div className="card-block">
      <div className="card-block-header">
        <div className="card-block-title">Decks</div>
        <div className="card-block-actions">
          {/* Rename / Delete / Share buttons — only when not editing */}
          {!isEditing && !isShared && selectedDeckId && (
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
                onClick={() => setConfirmingDelete(true)}
              >
                Delete
              </button>
            </>
          )}

          {/* Rename save/cancel */}
          {renaming && (
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
          )}
 

          {/* Create save/cancel */}
          {creating && (
            <>
              <button
                type="button"
                className="btn btn-success btn-small"
                onClick={handleCreate}
              >
                Save
              </button>
              <button
                type="button"
                className="btn btn-gray btn-small"
                onClick={() => {
                  setCreating(false);
                  setCreateValue("");
                }}
              >
                Cancel
              </button>
            </>
          )}
          {!isEditing && isShared && selectedDeckId && (
            <button
              type="button"
              className="btn btn-danger btn-small"
              onClick={() => setConfirmingLeave(true)}
            >
              Leave deck
            </button>
          )}
          {confirmingLeave && (
            <div
              style={{
                padding: "0.75rem 1rem",
                marginBottom: "0.75rem",
                borderRadius: "6px",
                border: "1px solid #cf222e",
                backgroundColor: "#fff0f0",
                fontSize: "0.9rem",
              }}
            >
              <div style={{ marginBottom: "0.5rem" }}>
                Remove <strong>{selectedDeck?.name}</strong> from your account?
                You can ask the owner to share it again.
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-danger btn-small"
                  onClick={async () => {
                    await onLeaveDeck(selectedDeckId);
                    setConfirmingLeave(false);
                  }}
                >
                  Yes, remove
                </button>
                <button
                  type="button"
                  className="btn btn-gray btn-small"
                  onClick={() => setConfirmingLeave(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Share button */}
          {!isEditing && (
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

          {/* New deck button */}
          {!isEditing && (
            <button
              type="button"
              className="btn btn-success btn-small"
              onClick={() => setCreating(true)}
            >
              + New deck
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation box */}
      {confirmingDelete && (
        <div
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "0.75rem",
            borderRadius: "6px",
            border: "1px solid #cf222e",
            backgroundColor: "#fff0f0",
            fontSize: "0.9rem",
          }}
        >
          <div style={{ marginBottom: "0.5rem" }}>
            Delete <strong>{selectedDeck?.name}</strong>? This will also delete
            all cards in it.
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-danger btn-small"
              onClick={handleDelete}
            >
              Yes, delete
            </button>
            <button
              type="button"
              className="btn btn-gray btn-small"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="form-field">
        <label>Current deck</label>
        {loading && decks.length === 0 ? (
          <div className="skeleton skeleton-select" />
        ) : renaming ? (
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
        ) : creating ? (
          <input
            type="text"
            placeholder="Deck name..."
            value={createValue}
            onChange={(e) => setCreateValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate(e);
              if (e.key === "Escape") {
                setCreating(false);
                setCreateValue("");
              }
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
    <>
      <option value="">All decks</option>

      {decks.filter((d) => !d.shared).length > 0 && (
        <optgroup label="My Decks">
          {decks
            .filter((d) => !d.shared)
            .map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
        </optgroup>
      )}

      {decks.filter((d) => d.shared).length > 0 && (
        <optgroup label="Shared with me">
          {decks
            .filter((d) => d.shared)
            .map((deck) => (
              <option key={deck.id} value={deck.id}>
                {`${deck.name} (by ${deck.shared_by_email || "someone"})`}
              </option>
            ))}
        </optgroup>
      )}
    </>
  )}
</select>
        )}
      </div>
    </div>
  );
}

export default DeckSelector;
