import React from "react";
import DeckSelector from "./DeckSelector";
import NewCardForm from "./NewCardForm";
import AIGenerator from "./AIGenerator";
import CardList from "./CardList";

function ManageView({
  decks,
  selectedDeckId,
  setSelectedDeckId,
  onCreateDeck,
  onShareDeck,
  cards,
  front,
  back,
  setFront,
  setBack,
  loading,
  error,
  onCreateCard,
  editingId,
  editFront,
  editBack,
  setEditFront,
  setEditBack,
  onStartEdit,
  onSaveEdit,
  onDeleteCard,
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
  currentUserId, 
}) {
  return (
    <>
      <DeckSelector
        decks={decks}
        selectedDeckId={selectedDeckId}
        setSelectedDeckId={setSelectedDeckId}
        onCreateDeck={onCreateDeck}
        onShareDeck={onShareDeck} 
      />

      <NewCardForm
        decks={decks}
        selectedDeckId={selectedDeckId}
        setSelectedDeckId={setSelectedDeckId}
        front={front}
        back={back}
        setFront={setFront}
        setBack={setBack}
        loading={loading}
        error={error}
        onSubmit={onCreateCard}
      />

      <AIGenerator
        aiSourceText={aiSourceText}
        setAiSourceText={setAiSourceText}
        aiError={aiError}
        aiLoading={aiLoading}
        aiGeneratedCards={aiGeneratedCards}
        setAiGeneratedCards={setAiGeneratedCards}
        anySelected={anySelected}
        onGenerate={onGenerate}
        onSaveGenerated={onSaveGenerated}
        isPro={isPro}
        aiGenerationsUsed={aiGenerationsUsed}
        aiFreeLimit={aiFreeLimit}
        aiRemaining={aiRemaining}
        onUpgrade={onUpgrade}
      />

      <CardList
        decks={decks}
        cards={cards}
        loading={loading}
        editingId={editingId}
        editFront={editFront}
        editBack={editBack}
        setEditFront={setEditFront}
        setEditBack={setEditBack}
        onStartEdit={onStartEdit}
        onSaveEdit={onSaveEdit}
        onDeleteCard={onDeleteCard}
        currentUserId={currentUserId}
      />
    </>
  );
}

export default ManageView;