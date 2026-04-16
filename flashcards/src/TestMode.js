import React, { useState, useEffect } from "react";

function TestMode({ studyCards, API_URL, token, isPro, onUpgrade, deckId }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [testsUsed, setTestsUsed] = useState(0);
  const freeLimit = 3;

  const [scoreHistory, setScoreHistory] = useState([]);

  useEffect(() => {
  async function loadUsage() {
    try {
      const res = await fetch(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.user?.ai_tests_used != null) {
        setTestsUsed(data.user.ai_tests_used);
      }
    } catch (err) {}
  }

  async function loadHistory() {
    try {
      const url = deckId
        ? `${API_URL}/ai/test-scores?deck_id=${deckId}`
        : `${API_URL}/ai/test-scores`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setScoreHistory(data);
    } catch (err) {}
  }

  loadUsage();
  loadHistory();
}, [API_URL, token, deckId]);

  async function generateTest() {
    setLoading(true);
    setError("");
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);

    try {
      const res = await fetch(`${API_URL}/ai/generate-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cards: studyCards }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          setError(data.error);
          return;
        }
        throw new Error(data.error || "Failed to generate test");
      }
      if (typeof data.ai_tests_used === "number") {
        setTestsUsed(data.ai_tests_used);
      }
      setQuestions(data.questions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleAnswer(index, value) {
    setAnswers((prev) => ({ ...prev, [index]: value }));
  }

 async function handleSubmit() {
  let correct = 0;
  questions.forEach((q, i) => {
    const userAnswer = (answers[i] || "").trim().toLowerCase();
    const correctAnswer = q.answer.trim().toLowerCase();
    if (userAnswer === correctAnswer) correct++;
  });
  setScore(correct);
  setSubmitted(true);
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Save score
  try {
    await fetch(`${API_URL}/ai/save-test-score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ deck_id: deckId, score: correct, total: questions.length }),
    });
    // Refresh history
    const url = deckId
      ? `${API_URL}/ai/test-scores?deck_id=${deckId}`
      : `${API_URL}/ai/test-scores`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (Array.isArray(data)) setScoreHistory(data);
  } catch (err) {
    console.error("save score error:", err);
  }
}

  function isCorrect(index) {
    const userAnswer = (answers[index] || "").trim().toLowerCase();
    const correctAnswer = questions[index].answer.trim().toLowerCase();
    return userAnswer === correctAnswer;
  }

  if (loading) {
    return (
      <div className="muted-text" style={{ marginTop: "1rem" }}>
        Generating your test...
      </div>
    );
  }



  if (questions.length === 0) {
    return (
      <div style={{ marginTop: "1rem" }}>
        {error && (
          <div className="error-text" style={{ marginBottom: "0.75rem" }}>
            {error}
            {error.includes("Upgrade") && (
              <button
                className="btn btn-primary btn-small"
                style={{ marginLeft: "0.75rem" }}
                onClick={onUpgrade}
              >
                Go Pro
              </button>
            )}
          </div>
        )}
        {!error && (
          <div
            className="muted-text"
            style={{ marginBottom: "0.5rem", fontSize: "0.85rem" }}
          >
          {isPro ? (
      "Unlimited AI tests"
    ) : freeLimit - testsUsed <= 0 ? (
      <>
        No free tests remaining.{" "}
        <button
          className="btn btn-primary btn-small"
          style={{ marginLeft: "0.25rem" }}
          onClick={onUpgrade}
        >
          Go Pro for unlimited tests
        </button>
      </>
    ) : (
      `${Math.max(0, freeLimit - testsUsed)} free test${freeLimit - testsUsed === 1 ? "" : "s"} remaining`
    )}
          </div>
        )}

        {scoreHistory.length > 0 && (
  <div style={{ marginBottom: "1rem" }}>
    <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.4rem" }}>
      Past scores
    </div>
    {scoreHistory.map((s, i) => (
      <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", padding: "0.3rem 0", borderBottom: "1px solid #e5e7eb" }}>
        <span className="muted-text">{new Date(s.created_at).toLocaleDateString()}</span>
        <span style={{ fontWeight: 600, color: s.score / s.total >= 0.8 ? "#16a34a" : s.score / s.total >= 0.5 ? "#d97706" : "#dc2626" }}>
          {s.score}/{s.total} ({Math.round(s.score / s.total * 100)}%)
        </span>
      </div>
    ))}
  </div>
)}
        <button
          className="btn btn-primary btn-small"
          onClick={generateTest}
          disabled={!isPro && testsUsed >= freeLimit}
        >
          Generate AI Test
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      {submitted && (
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "8px",
            border: "1px solid var(--border-subtle, #d0d7de)",
            backgroundColor: "var(--bg-subtle, #f6f8fa)",
            textAlign: "center",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              fontSize: "1.1rem",
              fontWeight: 600,
              marginBottom: "0.25rem",
            }}
          >
            Test complete
          </div>
          <div style={{ fontSize: "1.05rem", marginBottom: "0.25rem" }}>
            You scored <strong>{score}</strong> out of{" "}
            <strong>{questions.length}</strong>.
          </div>
          <div
            className="muted-text"
            style={{ fontSize: "0.95rem", marginBottom: "1rem" }}
          >
            {score / questions.length >= 0.8
              ? "Great job!"
              : "Keep practicing!"}
          </div>
          <button className="btn btn-primary btn-small" onClick={generateTest}>
            Retake Test
          </button>
        </div>
      )}

      {questions.map((q, i) => {
        const answered = submitted;
        const correct = answered && isCorrect(i);

        return (
          <div
            key={i}
            style={{
              marginBottom: "1.5rem",
              padding: "1rem 1.25rem",
              borderRadius: "8px",
              border: `1px solid ${
                answered
                  ? correct
                    ? "#2da44e"
                    : "#cf222e"
                  : "var(--border-subtle, #d0d7de)"
              }`,
              backgroundColor: answered
                ? correct
                  ? "#f0fff4"
                  : "#fff0f0"
                : "var(--bg-card, #fff)",
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: "0.75rem" }}>
              {i + 1}. {q.question}
              <span
                className="muted-text"
                style={{
                  fontSize: "0.75rem",
                  marginLeft: "0.5rem",
                  fontWeight: 400,
                }}
              >
                ({q.type.replace("_", " ")})
              </span>
            </div>

            {q.type === "multiple_choice" && (
              <div>
                {q.options.map((opt, j) => (
                  <label
                    key={j}
                    style={{
                      display: "block",
                      marginBottom: "0.4rem",
                      cursor: answered ? "default" : "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name={`q${i}`}
                      value={opt}
                      checked={answers[i] === opt}
                      onChange={() => handleAnswer(i, opt)}
                      disabled={answered}
                      style={{ marginRight: "0.5rem" }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {q.type === "true_false" && (
              <div>
                {["true", "false"].map((opt) => (
                  <label
                    key={opt}
                    style={{
                      display: "block",
                      marginBottom: "0.4rem",
                      cursor: answered ? "default" : "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name={`q${i}`}
                      value={opt}
                      checked={answers[i] === opt}
                      onChange={() => handleAnswer(i, opt)}
                      disabled={answered}
                      style={{ marginRight: "0.5rem" }}
                    />
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </label>
                ))}
              </div>
            )}

            {q.type === "fill_blank" && (
              <input
                type="text"
                placeholder="Your answer..."
                value={answers[i] || ""}
                onChange={(e) => handleAnswer(i, e.target.value)}
                disabled={answered}
                style={{
                  padding: "0.4rem 0.6rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle, #d0d7de)",
                  fontSize: "0.95rem",
                  width: "100%",
                  maxWidth: "300px",
                }}
              />
            )}

            {answered && (
              <div
                style={{
                  marginTop: "0.6rem",
                  fontSize: "0.85rem",
                  color: correct ? "#2da44e" : "#cf222e",
                }}
              >
                {correct
                  ? "Correct"
                  : `Incorrect — correct answer: ${q.answer}`}
              </div>
            )}
          </div>
        );
      })}

      {!submitted && (
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < questions.length}
        >
          Submit Test
        </button>
      )}
    </div>
  );
}

export default TestMode;
