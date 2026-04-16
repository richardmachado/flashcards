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

   if (loading && cards.length === 0) {
    return (
      <div className="card-block">
        <h2 className="section-title">Your cards</h2>
        <div className="cards-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton skeleton-line skeleton-line-medium" />
              <div className="skeleton skeleton-line skeleton-line-full" />
              <div className="skeleton skeleton-line skeleton-line-short" />
            </div>
          ))}
        </div>
      </div>
    );
  }
    
  return (
    
    <div className="card-block">
      <h2 className="section-title">Your cards</h2>
      {cards.some((c) => c.difficulty === 2) && (
  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.75rem", fontSize: "0.8rem" }} className="muted-text">
    <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#dc2626" }} />
    Hard card
  </div>
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
                <div className="card-item-front">
  {card.difficulty === 2 && (
    <span style={{
      display: "inline-block",
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      backgroundColor: "#dc2626",
      marginRight: "6px",
      verticalAlign: "middle",
    }} />
  )}
  {card.front}
</div>
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