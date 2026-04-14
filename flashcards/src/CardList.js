import React from "react";

function CardList({
  decks,
  cards,
  loading,
  editingId,
  editFront,
  editBack,
  setEditFront,
  setEditBack,
  onStartEdit,
  onSaveEdit,
  onDeleteCard,
   currentUserId,  
}) {
    
  return (
    
    <div className="card-block">
      <h2 className="section-title">Your cards</h2>
      {loading && cards.length === 0 && (
        <div className="muted-text">Loading...</div>
      )}
      {cards.length === 0 && !loading && (
        <div className="muted-text">No cards yet.</div>
      )}
      <div className="cards-grid">
        {cards.map((card) => (
          
          <div key={card.id} className="card-item">
            {editingId === card.id ? (
              <form onSubmit={onSaveEdit}>
                <div className="form-field">
                  <label>Front</label>
                  <textarea
                    rows={2}
                    value={editFront}
                    onChange={(e) => setEditFront(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Back</label>
                  <textarea
                    rows={2}
                    value={editBack}
                    onChange={(e) => setEditBack(e.target.value)}
                  />
                </div>
                <div className="card-item-actions">
                  <button
                    type="submit"
                    className="btn btn-success btn-small"
                    disabled={loading}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn btn-gray btn-small"
                    onClick={() => onStartEdit({ id: null })}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="card-item-front">{card.front}</div>
                <div className="card-item-back">{card.back}</div>
                <div className="card-item-footer">
    <div className="card-item-deck">
  Deck:{" "}
  {(() => {
    const deck = decks.find((d) => d.id === card.deck_id);
    if (!deck) return card.deck_id;
    return deck.shared
      ? `${deck.name} (shared by ${deck.shared_by_email || "someone"})`
      : deck.name;
  })()}
</div>
<div className="card-item-buttons">
  {card.user_id === currentUserId ? (
    <>
      <button
        type="button"
        className="btn btn-primary btn-tiny"
        onClick={() => onStartEdit(card)}
      >
        Edit
      </button>
      <button
        type="button"
        className="btn btn-danger btn-tiny"
        onClick={() => onDeleteCard(card.id)}
      >
        Delete
      </button>
    </>
  ) : (
    <span className="muted-text" style={{ fontSize: "0.75rem" }}>
      View only
    </span>
  )}
</div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CardList;