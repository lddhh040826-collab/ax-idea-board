// ① 파일 검사 + ② 텍스트 추출. 실패하면 "왜 안 되는지 / 어떻게 하면 되는지"를 담은 오류를 던진다.
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

const MAX_MB = 20 // 크기 한도는 미정(handoff 남은 질문 5). 임시로 20MB.

export class FileProblem extends Error {}

export async function extractText(file) {
  const name = file.name.toLowerCase()
  if (file.size > MAX_MB * 1024 * 1024) {
    throw new FileProblem(`파일이 너무 커요. ${MAX_MB}MB 이하로 올려 주세요.`)
  }

  let text
  if (name.endsWith('.docx')) text = await extractDocx(file)
  else if (name.endsWith('.pdf')) text = await extractPdf(file)
  else if (name.endsWith('.txt')) text = await file.text()
  else if (name.endsWith('.hwp') || name.endsWith('.hwpx') || name.endsWith('.doc')) {
    throw new FileProblem('한글(HWP)·doc 파일은 아직 읽을 수 없어요. docx나 PDF로 저장해서 올려 주세요.')
  } else {
    throw new FileProblem('지원하지 않는 형식이에요. docx나 PDF로 올려 주세요.')
  }

  if (!text.replace(/\s/g, '')) {
    throw new FileProblem('파일에서 글자를 찾지 못했어요. 내용이 비어 있지 않은지 확인해 주세요.')
  }
  return text
}

async function extractDocx(file) {
  const mammoth = await import('mammoth')
  try {
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return value
  } catch {
    throw new FileProblem('docx 파일을 열 수 없어요. 암호가 걸려 있거나 파일이 손상됐을 수 있어요. 암호를 풀고 다시 저장해서 올려 주세요.')
  }
}

async function extractPdf(file) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.min.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  let doc
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  } catch (e) {
    if (e?.name === 'PasswordException') {
      throw new FileProblem('암호가 걸린 파일이라 열 수 없어요. 암호를 풀고 올려 주세요.')
    }
    throw new FileProblem('PDF 파일을 열 수 없어요. 파일이 손상됐을 수 있어요. 원본 docx를 올려 주세요.')
  }

  const lines = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const { items } = await page.getTextContent()
    let line = ''
    for (const item of items) {
      line += item.str
      if (item.hasEOL) {
        lines.push(line)
        line = ''
      }
    }
    if (line) lines.push(line)
  }
  const text = lines.join('\n')
  if (!text.replace(/\s/g, '')) {
    throw new FileProblem('글자가 아닌 이미지로 된 PDF라 읽을 수 없어요. 원본 docx나 텍스트 PDF를 올려 주세요.')
  }
  return text
}
