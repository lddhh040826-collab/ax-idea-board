import { useEffect, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'ax-idea-board:cards'

function loadCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function App() {
  const [cards, setCards] = useState(loadCards)
  const [title, setTitle] = useState('')
  const [task, setTask] = useState('')
  const [idea, setIdea] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
  }, [cards])

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !task.trim() || !idea.trim()) return

    const newCard = {
      id: crypto.randomUUID(),
      title: title.trim(),
      task: task.trim(),
      idea: idea.trim(),
      createdAt: new Date().toISOString(),
    }

    setCards((prev) => [newCard, ...prev])
    setTitle('')
    setTask('')
    setIdea('')
  }

  function handleDelete(id) {
    setCards((prev) => prev.filter((card) => card.id !== id))
  }

  return (
    <>
      <h1>AX 아이디어 보드</h1>
      <p className="subtitle">
        업무에 AI를 어떻게 활용할지 아이디어를 카드로 기록해보세요.
      </p>

      <form className="idea-form" onSubmit={handleSubmit}>
        <label>
          제목
          <input
            type="text"
            placeholder="예: 회의록 자동 요약"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          대상 업무
          <input
            type="text"
            placeholder="예: 주간 팀 회의"
            value={task}
            onChange={(e) => setTask(e.target.value)}
          />
        </label>
        <label>
          AI 활용 아이디어
          <textarea
            placeholder="예: 회의 녹음을 텍스트로 변환한 뒤 핵심 내용을 요약하고 액션 아이템을 정리한다."
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={3}
          />
        </label>
        <button type="submit">카드 추가</button>
      </form>

      <section className="card-list">
        {cards.length === 0 ? (
          <p className="empty">아직 등록된 아이디어가 없습니다.</p>
        ) : (
          cards.map((card) => (
            <article className="card" key={card.id}>
              <header>
                <h2>{card.title}</h2>
                <button
                  type="button"
                  className="delete-btn"
                  aria-label="카드 삭제"
                  onClick={() => handleDelete(card.id)}
                >
                  삭제
                </button>
              </header>
              <p className="card-task">대상 업무: {card.task}</p>
              <p className="card-idea">{card.idea}</p>
            </article>
          ))
        )}
      </section>
    </>
  )
}

export default App
