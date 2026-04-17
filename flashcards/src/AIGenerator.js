import React, { useRef, useState } from "react";

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
  isPro,
  aiGenerationsUsed,
  aiFreeLimit,
  aiRemaining,
  onUpgrade,
  onUploadGenerate,
}) {
  const fileInputRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [fileName, setFileName] = useState("");

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setUploadError("");
    setUploadLoading(true);

    try {
      await onUploadGenerate(file);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadLoading(false);
      // Reset input so same file can be re-uploaded
      e.target.value = "";
    }
  }

  const isLoading = aiLoading || uploadLoading;
  const atLimit = !isPro && aiRemaining <= 0;

  return (
    <div className="card-block">
      <h2 className="section-title">Generate cards with AI</h2>
      <p className="muted-text">
        Paste your notes or upload a PDF/text file, then click{" "}
        <strong>Generate</strong>. Review the suggested cards and save them into
        the selected deck.
      </p>

      {!isPro && (
        <p className="muted-text">
          {aiRemaining > 0
            ? `${aiRemaining} free AI generation${aiRemaining === 1 ? "" : "s"} left (${aiGenerationsUsed}/${aiFreeLimit} used)`
            : "Free AI limit reached — upgrade to Pro to keep generating cards."}
        </p>
      )}

      {isPro && (
        <p className="muted-text">Pro plan: unlimited AI generations</p>
      )}

      {/* Upload section */}
      <div style={{ marginBottom: "0.75rem" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
        <button
          type="button"
          className="btn btn-gray btn-small"
          onClick={() => fileInputRef.current.click()}
          disabled={isLoading || atLimit}
        >
          {uploadLoading ? "Processing..." : "Upload PDF or text file"}
        </button>
        {fileName && !uploadLoading && (
          <span className="muted-text" style={{ marginLeft: "0.6rem", fontSize: "0.85rem" }}>
            {fileName}
          </span>
        )}
        {uploadError && (
          <div className="error-text" style={{ marginTop: "0.4rem" }}>
            {uploadError}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
        <span className="muted-text" style={{ fontSize: "0.8rem" }}>or paste text</span>
        <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
      </div>

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
        disabled={isLoading || !aiSourceText.trim() || atLimit}
      >
        {aiLoading ? "Generating..." : "Generate cards"}
      </button>

      {atLimit && (
        <button
          type="button"
          className="btn btn-small"
          onClick={onUpgrade}
          style={{ marginLeft: "0.75rem" }}
        >
          Go Pro
        </button>
      )}

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
                  "generated-card" + (c.selected ? " generated-card-selected" : "")
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
            disabled={isLoading || !anySelected}
          >
            {isLoading ? "Saving..." : "Save selected to deck"}
          </button>
        </>
      )}
    </div>
  );
}

export default AIGenerator;