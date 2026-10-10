// [공유 링크 복사] DB가 정해지기 전까지는 두 버전 원문을 압축해 링크(#s=…)에 담는다. 서버에 저장하지 않는다.
const fromB64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

async function pipe(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer())
}

export async function encodeShare(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  const packed = await pipe(bytes, new CompressionStream('deflate-raw'))
  let s = ''
  for (let i = 0; i < packed.length; i += 0x8000) s += String.fromCharCode(...packed.subarray(i, i + 0x8000))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function decodeShare(token) {
  const bytes = await pipe(fromB64(token), new DecompressionStream('deflate-raw'))
  return JSON.parse(new TextDecoder().decode(bytes))
}
