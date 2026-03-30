import React from "react";

function AIGenerator({
  aiSourceText,
  setAiSourceText,
  aiError,
  aiLoading,
  aiGeneratedCards,
  setAiGeneratedCards,
  anySelected,
  onGenerate,
  onSaveGenerated,
}) {
  return (
    <div className="card-block">
      <h2 className="section-title">Generate cards with AI</h2>
      <p className="muted-text">
        Paste your notes below, then click <strong>Generate</strong>. Review the
        suggested cards and save them into the selected deck.
      </p>

      <div className="form-field">
        <label>Source text for this deck</label>
        <textarea
          rows={6}
          value={aiSourceText}
          onChange={(e) => setAiSourceText(e.target.value)}
          placeholder="Paste your lecture notes, textbook excerpt, etc..."
        />
      </div>

      {aiError && <div className="error-text">{aiError}</div>}

      <button
        type="button"
        className="btn btn-primary"
        onClick={onGenerate}
        disabled={aiLoading || !aiSourceText.trim()}
      >
        {aiLoading ? "Generating..." : "Generate cards"}
      </button>

      {aiGeneratedCards.length > 0 && (
        <>
          <h3 className="section-subtitle">
            Preview generated cards ({aiGeneratedCards.length})
          </h3>
          <div className="generated-grid">
            {aiGeneratedCards.map((c, idx) => (
              <div
                key={idx}
                className={
                  "generated-card" +
                  (c.selected ? " generated-card-selected" : "")
                }
              >
                <div className="generated-card-header">
                  <div className="generated-card-index">Card {idx + 1}</div>
                  <label className="generated-card-toggle">
                    <input
                      type="checkbox"
                      checked={c.selected}
                      onChange={() =>
                        setAiGeneratedCards((prev) =>
                          prev.map((card, i) =>
                            i === idx ? { ...card, selected: !card.selected } : card
                          )
                        )
                      }
                    />
                    Include
                  </label>
                </div>
                <div className="generated-card-front">{c.front}</div>
                <div className="generated-card-back">{c.back}</div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-success"
            onClick={onSaveGenerated}
            disabled={aiLoading || !anySelected}
          >
            {aiLoading ? "Saving..." : "Save selected to deck"}
          </button>
        </>
      )}
    </div>
  );
}

export default AIGenerator;