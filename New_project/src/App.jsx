import { useEffect, useState } from 'react'
import { compareTexts } from './lib/compare.js'
import { extractText, FileProblem } from './lib/extract.js'
import { useInstallPrompt } from './lib/install.js'
import { decodeShare, encodeShare } from './lib/share.js'
import { samples } from './samples.js'
import './App.css'

const STATUS_LABEL = { added: '추가', deleted: '삭제', modified: '수정', same: '동일' }

function runCompare(source) {
  return { ...source, result: compareTexts(source.old, source.new) }
}

export default function App() {
  const [compared, setCompared] = useState(null)
  const [loadError, setLoadError] = useState('')

  // 공유 링크(#s=…)로 열면 바로 결과 화면을 보여 준다.
  useEffect(() => {
    const token = new URLSearchParams(location.hash.slice(1)).get('s')
    if (!token) return
    decodeShare(token)
      .then((source) => setCompared(runCompare(source)))
      .catch(() => setLoadError('공유 링크를 열 수 없어요. 링크가 잘렸을 수 있어요. 링크 전체를 다시 복사해 주세요.'))
  }, [])

  function reset() {
    history.replaceState(null, '', location.pathname)
    setCompared(null)
  }

  return compared ? (
    <ResultScreen compared={compared} onBack={reset} />
  ) : (
    <UploadScreen onCompared={setCompared} initialError={loadError} />
  )
}

/* ───────── 화면 1 · 업로드 ───────── */

function UploadScreen({ onCompared, initialError }) {
  const [files, setFiles] = useState({ old: null, new: null })
  const [errors, setErrors] = useState({ old: '', new: '' })
  const [formError, setFormError] = useState(initialError)
  const [busy, setBusy] = useState(false)
  const install = useInstallPrompt()

  useEffect(() => setFormError(initialError), [initialError])

  function pick(side, file) {
    setFiles((f) => ({ ...f, [side]: file }))
    setErrors((e) => ({ ...e, [side]: '' }))
    setFormError('')
  }

  async function handleCompare() {
    setBusy(true)
    setFormError('')
    const nextErrors = { old: '', new: '' }
    const texts = {}
    for (const side of ['old', 'new']) {
      try {
        texts[side] = await extractText(files[side])
      } catch (e) {
        nextErrors[side] = e instanceof FileProblem ? e.message : '파일을 읽는 중 문제가 생겼어요. 다시 올려 주세요.'
      }
    }
    setErrors(nextErrors)
    if (!nextErrors.old && !nextErrors.new) {
      try {
        onCompared(runCompare({ oldName: files.old.name, newName: files.new.name, old: texts.old, new: texts.new }))
      } catch (e) {
        setFormError(e.message)
      }
    }
    setBusy(false)
  }

  function trySample(s) {
    onCompared(runCompare({ oldName: s.oldName, newName: s.newName, old: s.old, new: s.new }))
  }

  return (
    <main className="upload">
      <header className="upload-head">
        <div>
          <h1>계약서 버전 대조</h1>
          <p className="lead">구버전과 신버전을 올리면 조항별로 무엇이 어떻게 바뀌었는지 짚어 드려요. 가입 없이 바로 쓸 수 있어요.</p>
        </div>
        {install && (
          <button className="ghost install" onClick={install}>
            앱으로 설치
          </button>
        )}
      </header>

      <div className="slots">
        <FileSlot label="구버전 올리기" file={files.old} error={errors.old} onPick={(f) => pick('old', f)} />
        <FileSlot label="신버전 올리기" file={files.new} error={errors.new} onPick={(f) => pick('new', f)} />
      </div>

      {formError && <p className="notice error" role="alert">{formError}</p>}

      <div className="actions">
        <button className="primary" disabled={!files.old || !files.new || busy} onClick={handleCompare}>
          {busy ? '읽는 중…' : '비교하기'}
        </button>
        <span className="or">또는 샘플 계약서로 체험하기</span>
        {samples.map((s) => (
          <button key={s.id} className="ghost" onClick={() => trySample(s)}>
            {s.label}
          </button>
        ))}
      </div>

      <p className="hint">docx·텍스트 PDF를 읽을 수 있어요. 올린 파일은 이 브라우저 안에서만 읽고 서버로 보내지 않아요.</p>
    </main>
  )
}

function FileSlot({ label, file, error, onPick }) {
  return (
    <label className={`slot${error ? ' has-error' : ''}${file ? ' has-file' : ''}`}>
      <span className="slot-label">{label}</span>
      <span className="slot-file">{file ? file.name : 'docx 또는 PDF 파일을 고르세요'}</span>
      <input type="file" accept=".docx,.pdf,.txt" onChange={(e) => e.target.files[0] && onPick(e.target.files[0])} />
      {error && (
        <span className="slot-error" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}

/* ───────── 화면 2 · 비교 결과 ───────── */

function ResultScreen({ compared, onBack }) {
  const { result, oldName, newName } = compared
  const [filter, setFilter] = useState(null)
  const [showSame, setShowSame] = useState(false)
  const [open, setOpen] = useState(() => new Set())
  const [copyMsg, setCopyMsg] = useState('')

  const rows = result.rows.filter((r) => (filter ? r.status === filter : showSame || r.status !== 'same'))

  function toggle(i) {
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  async function copyLink() {
    try {
      const token = await encodeShare({ oldName, newName, old: compared.old, new: compared.new })
      const url = `${location.origin}${location.pathname}#s=${token}`
      history.replaceState(null, '', url)
      await navigator.clipboard.writeText(url)
      setCopyMsg('링크를 복사했어요')
    } catch {
      setCopyMsg('복사하지 못했어요. 주소창의 링크를 직접 복사해 주세요.')
    }
    setTimeout(() => setCopyMsg(''), 3000)
  }

  return (
    <main className="result">
      <header className="result-head">
        <div>
          <h1>비교 결과</h1>
          <p className="files">
            <span className="tag old">구</span> {oldName} <span className="arrow">→</span> <span className="tag new">신</span> {newName}
          </p>
        </div>
        <div className="toolbar no-print">
          <button className="ghost" onClick={onBack}>다른 파일 비교</button>
          <button className="ghost" onClick={() => window.print()}>인쇄/PDF 저장</button>
          <button className="primary" onClick={copyLink}>공유 링크 복사</button>
          {copyMsg && <span className="copy-msg" role="status">{copyMsg}</span>}
        </div>
      </header>

      <div className="chips no-print">
        {['added', 'deleted', 'modified'].map((s) => (
          <button
            key={s}
            className={`chip ${s}${filter === s ? ' active' : ''}`}
            aria-pressed={filter === s}
            onClick={() => setFilter(filter === s ? null : s)}
          >
            {STATUS_LABEL[s]} <b>{result.counts[s]}</b>
          </button>
        ))}
        {filter ? (
          <button className="chip-clear" onClick={() => setFilter(null)}>전체 보기</button>
        ) : (
          <label className="same-toggle">
            <input type="checkbox" checked={showSame} onChange={(e) => setShowSame(e.target.checked)} />
            동일 조항 {result.counts.same}개도 보기
          </label>
        )}
      </div>
      <p className="print-only">
        추가 {result.counts.added} · 삭제 {result.counts.deleted} · 수정 {result.counts.modified}
      </p>

      <table className="compare">
        <colgroup>
          <col className="c-no" />
          <col className="c-text" />
          <col className="c-text" />
          <col className="c-status" />
          <col className="c-summary" />
        </colgroup>
        <thead>
          <tr>
            <th>조항</th>
            <th>구버전</th>
            <th>신버전</th>
            <th>구분</th>
            <th>요약</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="empty">해당하는 조항이 없어요.</td>
            </tr>
          )}
          {rows.map((r) => {
            const i = result.rows.indexOf(r)
            return <Row key={i} row={r} isOpen={open.has(i)} onToggle={() => toggle(i)} />
          })}
        </tbody>
      </table>
    </main>
  )
}

function Row({ row, isOpen, onToggle }) {
  return (
    <>
      <tr className={`row ${row.status}`}>
        <td className="no">
          <b>{row.no}</b>
          {row.title && <span className="title">{row.title}</span>}
          {row.renumbered && <span className="moved">구 {row.renumbered}</span>}
        </td>
        <td className="text">
          <SideText row={row} side="old" />
        </td>
        <td className="text">
          <SideText row={row} side="new" />
        </td>
        <td>
          <span className={`badge ${row.status}`}>{STATUS_LABEL[row.status]}</span>
        </td>
        <td className="summary">
          {row.status === 'modified' ? (
            <button className="summary-btn" aria-expanded={isOpen} onClick={onToggle}>
              {row.summary}
              <span className="summary-meta">{isOpen ? '원문 접기 ▲' : '원문 근거 보기 ▼'}</span>
            </button>
          ) : (
            <span className="muted">{row.summary}</span>
          )}
        </td>
      </tr>
      {isOpen && (
        <tr className="evidence">
          <td />
          <td colSpan={4}>
            <p className="evidence-head">원문 근거 — 요약이 맞는지 아래 원문으로 확인하세요.</p>
            <dl>
              <dt>구버전</dt>
              <dd>{row.old}</dd>
              <dt>신버전</dt>
              <dd>{row.new}</dd>
            </dl>
          </td>
        </tr>
      )}
    </>
  )
}

// 추가는 초록, 삭제는 빨강 취소선, 수정은 바뀐 글자만 노랑.
function SideText({ row, side }) {
  const text = row[side]
  if (!text) return <span className="muted">—</span>
  if (row.status === 'added') return <ins className="hl-add">{text}</ins>
  if (row.status === 'deleted') return <del className="hl-del">{text}</del>
  if (row.status === 'same') return <span>{text}</span>
  const skip = side === 'old' ? 'insert' : 'delete'
  return (
    <span>
      {row.diffs
        .filter((d) => d.op !== skip)
        .map((d, k) =>
          d.op === 'equal' ? (
            <span key={k}>{d.text}</span>
          ) : (
            <mark key={k} className={side === 'old' ? 'hl-mod old' : 'hl-mod'}>
              {d.text}
            </mark>
          ),
        )}
    </span>
  )
}
