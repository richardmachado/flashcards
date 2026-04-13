import React, { useState } from "react";

function TestMode({ studyCards, API_URL, token }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      if (!res.ok) throw new Error(data.error || "Failed to generate test");
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

  function handleSubmit() {
    let correct = 0;
    questions.forEach((q, i) => {
      const userAnswer = (answers[i] || "").trim().toLowerCase();
      const correctAnswer = q.answer.trim().toLowerCase();
      if (userAnswer === correctAnswer) correct++;
    });
    setScore(correct);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        {error && <div className="error-text" style={{ marginBottom: "0.75rem" }}>{error}</div>}
        <button className="btn btn-primary btn-small" onClick={generateTest}>
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
          <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.25rem" }}>
            Test complete
          </div>
          <div style={{ fontSize: "1.05rem", marginBottom: "0.25rem" }}>
            You scored <strong>{score}</strong> out of <strong>{questions.length}</strong>.
          </div>
          <div className="muted-text" style={{ fontSize: "0.95rem", marginBottom: "1rem" }}>
            {score / questions.length >= 0.8 ? "Great job!" : "Keep practicing!"}
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
                answered ? (correct ? "#2da44e" : "#cf222e") : "var(--border-subtle, #d0d7de)"
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
                style={{ fontSize: "0.75rem", marginLeft: "0.5rem", fontWeight: 400 }}
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
                {correct ? "Correct" : `Incorrect — correct answer: ${q.answer}`}
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