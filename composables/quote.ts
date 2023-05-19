import type { mastodon } from 'masto'

/**
 * ***************************************************************************
 * This module is inspired by/adapted from modern-screenshot
 * (https://github.com/qq15725/modern-screenshot/blob/d1c861bb395326839f8dd5ff8765578389989ed2/LICENSE)
 * which is a fork of html-to-image (https://github.com/bubkoo/html-to-image/blob/master/LICENSE).
 * Both of those repositories are published under the following MIT License
 * ***************************************************************************
   MIT License

  Copyright (c) 2017-2023 W.Y.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
*/

export async function attachQuoteToDraft(file: any, publishWidget: Ref<any>, quotedStatus: mastodon.v1.Status): Promise<void> {
  const parseContent = (content: string) => {
    const noP = content.replaceAll(/<p[^>]*>/ig, ' ').replaceAll(/<.p[^>]*>/ig, ' ')
    const noSpan = noP.replaceAll(/<span[^>]*>/ig, ' ').replaceAll(/<.span[^>]*>/ig, ' ')
    const noAnchor = noSpan.replaceAll(/<a[^>]*>/ig, ' ').replaceAll(/<.a[^>]*>/ig, ' ')
    const noBr = noAnchor.replaceAll(/<br> */ig, '\n')
    return noBr.replaceAll(/ {2,}/ig, ' ').replaceAll(/[#] /g, '#').replaceAll(/[@] /g, '@').trim() // .replace('" ', '"').replace(/ ["]$/, '"')
  }
  const altTextInitialValue = `Quoting @${quotedStatus.account.acct}:\n\n${quotedStatus.text ?? parseContent(quotedStatus.content)}\n\nThe original post is available at ${quotedStatus.uri}`
  return await publishWidget.value?.attachQuoteToDraft(file, altTextInitialValue)
}

export function isQuotable(quotedStatus?: mastodon.v1.Status): boolean {
  if (quotedStatus) {
    if (quotedStatus.visibility === 'direct')
      return false

    return (
      ((quotedStatus.visibility === 'public') || (
        (['unlisted', 'private'].includes(quotedStatus.visibility)) && (
          (quotedStatus.account.id === currentUser.value?.account.id)
          && ((quotedStatus.inReplyToAccountId === null) || (quotedStatus.inReplyToAccountId === currentUser.value?.account.id))
        )
      )) && (
        ((quotedStatus.account.discoverable === true) || (quotedStatus.account.discoverable === null))
        && ((quotedStatus.account.locked === false) || (quotedStatus.account.locked === null))
        && (quotedStatus.account.note.toLowerCase().search(/(#?no ?qts?)|(#?no ?quotes?)|(#?no ?quoting?)/gi) === -1)
      ))
  }
  else {
    return false
  }
}

export function explainIsQuotable(quotedStatus?: mastodon.v1.Status): string {
  if (quotedStatus) {
    if (((quotedStatus.account.locked === false) || (quotedStatus.account.locked === null)) === false)
      return 'This account is private'
    else if ((quotedStatus.account.note.toLowerCase().search(/(#?no ?qts?)|(#?no ?quotes?)|(#?no ?quoting?)/gi) === -1) === false)
      return 'This account does not allow quoting'
    // } else if (((quotedStatus.account.discoverable === true) || (quotedStatus.account.discoverable === null)) === false) {
    //   return 'This account is not discoverable'
    else if (quotedStatus.visibility === 'direct')
      return 'Direct messages are not quotable'
    else if (quotedStatus.visibility !== 'public')
      return 'Posts with limited or restricted visibility are not quotable'
    else if ((quotedStatus.account.note.toLowerCase().search(/(#?no ?qts?)|(#?no ?quotes?)|(#?no ?quoting?)/gi) === -1) === false)
      return 'This account does not allow quoting'
    else
      return 'This post is not quotable'
  }
  else {
    return ''
  }
}

// Constants
const XMLNS = 'http://www.w3.org/2000/svg'
const IN_BROWSER = typeof window !== 'undefined'
const SUPPORT_WEB_WORKER = IN_BROWSER && 'Worker' in window
const USER_AGENT = IN_BROWSER ? window.navigator?.userAgent : ''
const IN_CHROME = USER_AGENT.includes('Chrome')
const IN_SAFARI = USER_AGENT.includes('AppleWebKit') && !IN_CHROME
const IN_FIREFOX = USER_AGENT.includes('Firefox')
const PREFIX = '[QUOTE]'

const URL_RE = /url\((['"]?)([^'"]+?)\1\)/g
const COMMENTS_RE = /(\/\*[\s\S]*?\*\/)/gi
const KEYFRAMES_RE = /((@.*?keyframes [\s\S]*?){([\s\S]*?}\s*?)})/gi
const URL_WITH_FORMAT_RE = /url\([^)]+\)\s*format\((["']?)([^"']+)\1\)/g
const FONT_SRC_RE = /src:\s*(?:url\([^)]+\)\s*format\([^)]+\)[,;]\s*)+/g

const isContext = <T extends Node>(value: any): value is Context<T> => value && '__CONTEXT__' in value
const isDataUrl = (url: string) => url.startsWith('data:')

const isCssFontFaceRule = (rule: CSSRule): rule is CSSFontFaceRule => rule.constructor.name === 'CSSFontFaceRule'
const isCSSImportRule = (rule: CSSRule): rule is CSSImportRule => rule.constructor.name === 'CSSImportRule'

const isElementNode = (node: Node): node is Element => node.nodeType === 1 // Node.ELEMENT_NODE
const isSVGElementNode = (node: Element): node is SVGElement => typeof (node as SVGElement).className === 'object'
const isSVGImageElementNode = (node: Element): node is SVGImageElement => isSVGElementNode(node) && node.tagName === 'image'
const isHTMLElementNode = (node: Node): node is HTMLElement => isElementNode(node) && typeof (node as HTMLElement).style !== 'undefined' && !isSVGElementNode(node)
const isCommentNode = (node: Node): node is Text => node.nodeType === 8 // Node.COMMENT_NODE
const isTextNode = (node: Node): node is Text => node.nodeType === 3 // Node.TEXT_NODE
const isImageElement = (node: Element): node is HTMLImageElement => node.tagName === 'IMG'
const isVideoElement = (node: Element): node is HTMLVideoElement => node.tagName === 'VIDEO'
const isStyleElement = (node: Element): node is HTMLStyleElement => node.tagName === 'STYLE'
const isScriptElement = (node: Element): node is HTMLScriptElement => node.tagName === 'SCRIPT'
const isSlotElement = (node: Element): node is HTMLSlotElement => node.tagName === 'SLOT'
// const isIFrameElement = (node: Element): node is HTMLIFrameElement => node.tagName === 'IFRAME'

// Console
const consoleWarn = (...args: any[]) => console.warn(PREFIX, ...args)
// eslint-disable-next-line no-console
const consoleTime = (label: string) => console.time(`${PREFIX} ${label}`)
// eslint-disable-next-line no-console
const consoleTimeEnd = (label: string) => console.timeEnd(`${PREFIX} ${label}`)

function supportWebp(ownerDocument?: Document) {
  const canvas = ownerDocument?.createElement?.('canvas')
  if (canvas)
    canvas.height = canvas.width = 1

  return canvas
    && 'toDataURL' in canvas
    && Boolean(canvas.toDataURL('image/webp').includes('image/webp'))
}

async function orCreateContext<T extends Node>(context: Context<T>): Promise<Context<T>>
async function orCreateContext<T extends Node>(node: T, options?: Options): Promise<Context<T>>
async function orCreateContext(node: any, options?: Options): Promise<Context> {
  return isContext(node) ? node : createContext(node, { ...options, autoDestruct: true })
}

function createStyleElement(ownerDocument?: Document) {
  if (!ownerDocument)
    return undefined
  const style = ownerDocument.createElement('style')
  const cssText = style.ownerDocument.createTextNode(`
.______background-clip--text {
  background-clip: text;
  -webkit-background-clip: text;
}
`)
  style.appendChild(cssText)
  return style
}

function resolveBoundingBox(node: Node, context: Context) {
  let { width, height } = context

  if (isElementNode(node) && (!width || !height)) {
    const box = node.getBoundingClientRect()

    width = width
      || box.width
      || Number(node.getAttribute('width'))
      || 0

    height = height
      || box.height
      || Number(node.getAttribute('height'))
      || 0
  }

  return { width, height }
}

function svgToDataUrl(svg: SVGElement) {
  const xhtml = new XMLSerializer()
    .serializeToString(svg)
    // https://www.w3.org/TR/xml/#charsets
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/ug, '')
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xhtml)}`
}

async function domToForeignObjectSvg<T extends Node>(node: T, options?: Options): Promise<SVGElement>
async function domToForeignObjectSvg<T extends Node>(context: Context<T>): Promise<SVGElement>
async function domToForeignObjectSvg(node: any, options?: any) {
  const context = await orCreateContext(node, options)

  if (isElementNode(context.node) && isSVGElementNode(context.node))
    return context.node

  const {
    ownerDocument,
    log,
    tasks,
    svgStyleElement,
    svgDefsElement,
    svgStyles,
    font,
    progress,
    autoDestruct,
    onCloneNode,
    onEmbedNode,
    onCreateForeignObjectSvg,
  } = context

  log.time('clone node')
  const clone = await cloneNode(context.node, context, true)
  if (svgStyleElement && ownerDocument) {
    let allCssText = ''
    svgStyles.forEach((klasses, cssText) => {
      allCssText += `${klasses.join(',\n')} {\n  ${cssText}\n}\n`
    })
    svgStyleElement.appendChild(ownerDocument.createTextNode(allCssText))
  }
  log.timeEnd('clone node')

  onCloneNode?.(clone)

  if (font !== false && isElementNode(clone)) {
    log.time('embed web font')
    await embedWebFont(clone, context)
    log.timeEnd('embed web font')
  }

  log.time('embed node')
  embedNode(clone, context)
  const count = tasks.length
  let current = 0
  const runTask = async () => {
    while (true) {
      const task = tasks.pop()
      if (!task)
        break
      try {
        await task
      }
      catch (error) {
        consoleWarn('Failed to run task', error)
      }
      progress?.(++current, count)
    }
  }
  progress?.(current, count)
  await Promise.all([...Array(4)].map(runTask))
  log.timeEnd('embed node')

  onEmbedNode?.(clone)

  const svg = createForeignObjectSvg(clone, context)
  svgDefsElement && svg.insertBefore(svgDefsElement, svg.children[0])
  svgStyleElement && svg.insertBefore(svgStyleElement, svg.children[0])

  autoDestruct && destroyContext(context)

  onCreateForeignObjectSvg?.(svg)

  return svg
}

function createForeignObjectSvg(clone: Node, context: Context): SVGSVGElement {
  const { width, height } = context
  const svg = createSvg(width, height, clone.ownerDocument)
  const foreignObject = svg.ownerDocument.createElementNS(svg.namespaceURI, 'foreignObject')
  foreignObject.setAttributeNS(null, 'x', '0%')
  foreignObject.setAttributeNS(null, 'y', '0%')
  foreignObject.setAttributeNS(null, 'width', '100%')
  foreignObject.setAttributeNS(null, 'height', '100%')
  foreignObject.appendChild(clone)
  svg.appendChild(foreignObject)
  return svg
}

async function loadMedia<T extends Media>(media: T, options?: LoadMediaOptions): Promise<T>
async function loadMedia(media: string, options?: LoadMediaOptions): Promise<HTMLImageElement>
async function loadMedia(media: any, options?: LoadMediaOptions): Promise<any> {
  return new Promise((resolve) => {
    const { timeout, ownerDocument, onError: userOnError } = options ?? {}
    const node: Media = typeof media === 'string'
      ? createImage(media, getDocument(ownerDocument))
      : media
    let timer: any = null
    let removeEventListeners: null | (() => void) = null

    function onResolve() {
      resolve(node)
      timer && clearTimeout(timer)
      removeEventListeners?.()
    }

    if (timeout)
      timer = setTimeout(onResolve, timeout)

    if (isVideoElement(node)) {
      const currentSrc = (node.currentSrc || node.src)
      if (!currentSrc) {
        if (node.poster)
          return loadMedia(node.poster, options).then(resolve)

        return onResolve()
      }
      if (node.readyState >= 2)
        return onResolve()

      const onLoadeddata = onResolve
      const onError = (error: any) => {
        consoleWarn(
          'Failed video load',
          currentSrc,
          error,
        )
        userOnError?.(error)
        onResolve()
      }
      removeEventListeners = () => {
        node.removeEventListener('loadeddata', onLoadeddata)
        node.removeEventListener('error', onError)
      }
      node.addEventListener('loadeddata', onLoadeddata, { once: true })
      node.addEventListener('error', onError, { once: true })
    }
    else {
      // console.log(isSVGImageElementNode(node))
      // console.log(node.getAttribute('src')?.includes('data:image/svg+xml'))
      const currentSrc = isSVGImageElementNode(node)
        ? (node?.href?.baseVal ?? 'https://static.fedified.com/headers/original/missing.png')
        : (node.currentSrc || node.src)

      if (!currentSrc)
        return onResolve()

      const onLoad = async () => {
        if (isImageElement(node) && 'decode' in node) {
          try {
            await node.decode()
          }
          catch (error) {
            consoleWarn(
              'Failed to decode image, trying to render anyway',
              node.dataset.originalSrc || currentSrc,
              error,
            )
          }
        }
        onResolve()
      }

      const onError = (error: any) => {
        consoleWarn(
          'Failed image load',
          node.dataset.originalSrc || currentSrc,
          error,
        )
        onResolve()
      }

      if (isImageElement(node) && node.complete)
        return onLoad()

      removeEventListeners = () => {
        node.removeEventListener('load', onLoad)
        node.removeEventListener('error', onError)
      }

      node.addEventListener('load', onLoad, { once: true })
      node.addEventListener('error', onError, { once: true })
    }
  })
}

function getDocument<T extends Node>(target?: T | null): Document {
  return (((target && isElementNode(target as any)) ? target?.ownerDocument : target) ?? window.document) as any
}

function createImage(url: string, ownerDocument?: Document | null): HTMLImageElement {
  const img = getDocument(ownerDocument).createElement('img')
  img.decoding = 'sync'
  img.loading = 'eager'
  img.src = url
  return img
}

async function imageToCanvas<T extends HTMLImageElement>(
  image: T,
  context: Context,
): Promise<HTMLCanvasElement> {
  const {
    log,
    timeout,
    drawImageCount,
    drawImageInterval,
  } = context

  log.time('image to canvas')
  const loaded = await loadMedia(image, { timeout })
  const { canvas, context2d } = createCanvas(image.ownerDocument, context)
  const drawImage = () => {
    try {
      if (context2d) {
        context2d.fillRect(0, 0, canvas.width, canvas.height)
        context2d.drawImage(loaded, 0, 0, canvas.width, canvas.height)
      }
      else {
        console.error('No canvas available')
      }
    }
    catch (error) {
      consoleWarn('Failed to drawImage', error)
    }
  }

  drawImage()

  for (let i = 0; i < drawImageCount; i++) {
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        drawImage()
        resolve()
      }, i + drawImageInterval)
    })
  }

  context.drawImageCount = 0

  log.timeEnd('image to canvas')
  return canvas
}

function createCanvas(ownerDocument: Document, context: Context) {
  const { width, height, scale, backgroundColor, maximumCanvasSize: max } = context

  const canvas = ownerDocument.createElement('canvas')

  canvas.width = Math.floor(width * scale)
  canvas.height = Math.floor(height * scale)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  if (max) {
    if (canvas.width > max || canvas.height > max) {
      if (canvas.width > max && canvas.height > max) {
        if (canvas.width > canvas.height) {
          canvas.height *= max / canvas.width
          canvas.width = max
        }
        else {
          canvas.width *= max / canvas.height
          canvas.height = max
        }
      }
      else if (canvas.width > max) {
        canvas.height *= max / canvas.width
        canvas.width = max
      }
      else {
        canvas.width *= max / canvas.height
        canvas.height = max
      }
    }
  }

  const context2d = canvas.getContext('2d')

  if (context2d && backgroundColor) {
    context2d.fillStyle = backgroundColor
    context2d.fillRect(0, 0, canvas.width, canvas.height)
  }

  return { canvas, context2d }
}

interface LoadMediaOptions {
  ownerDocument?: Document
  timeout?: number
  onError?: (error: Error) => void
}

type Media = HTMLVideoElement | HTMLImageElement | SVGImageElement

function shouldNodeBeIncluded<T extends Node>(el: T): boolean
function shouldNodeBeIncluded(el: Element): boolean {
  if (['IFRAME'].includes(el.tagName)) {
    // console.debug(el.tagName)
    return false
  }

  if ((el) && (['#text', '#comment', 'IFRAME'].includes(el.nodeName) === false)) {
    // el.removeAttribute('data-v-inspector')
    // el.removeAttribute('class')
    // console.log(el)
    return (el.getAttribute('src')?.includes('data:image/svg+xml') !== true)
  }

  return true
}

async function createContext<T extends Node>(node: T, options?: Options & { autoDestruct?: boolean }): Promise<Context<T>> {
  const { scale = 1, workerUrl, workerNumber = 1 } = options || {}

  const debug = Boolean(options?.debug)

  const ownerDocument = node.ownerDocument ?? (IN_BROWSER ? window.document : undefined)
  const ownerWindow = node.ownerDocument?.defaultView ?? (IN_BROWSER ? window : undefined)
  const requests = new Map<string, Request>()

  const context: Context<T> = {
    // Options
    width: 0,
    height: 0,
    quality: 1,
    type: 'image/png',
    scale,
    backgroundColor: '#171717',
    style: null,
    filter: shouldNodeBeIncluded,
    maximumCanvasSize: 0,
    timeout: 10000,
    progress: null,
    debug,
    fetch: {
      requestInit: getDefaultRequestInit(options?.fetch?.bypassingCache),
      placeholderImage: 'data:image/png;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      bypassingCache: false,
      ...options?.fetch,
    },
    font: {},
    drawImageInterval: 100,
    workerUrl: null,
    workerNumber,
    onCloneNode: null,
    onEmbedNode: null,
    onCreateForeignObjectSvg: null,
    autoDestruct: false,
    ...options,

    // InternalContext
    __CONTEXT__: true,
    log: createLogger(debug),
    node,
    ownerDocument,
    ownerWindow,
    dpi: scale === 1 ? null : 96 * scale,
    svgStyleElement: createStyleElement(ownerDocument),
    svgDefsElement: ownerDocument?.createElementNS(XMLNS, 'defs'),
    svgStyles: new Map(),
    defaultComputedStyles: new Map(),
    workers: [
      ...new Array(((SUPPORT_WEB_WORKER && workerUrl && workerNumber) ? workerNumber : 0)),
    ].map(() => {
      try {
        const worker = new Worker(workerUrl!)
        worker.onmessage = async (event) => {
          const { url, result } = event.data
          if (result)
            requests.get(url)?.resolve?.(result)
          else
            requests.get(url)?.reject?.(new Error(`Error receiving message from worker: ${url}`))
        }
        worker.onmessageerror = (event) => {
          const { url } = event.data
          requests.get(url)?.reject?.(new Error(`Error receiving message from worker: ${url}`))
        }
        return worker
      }
      catch (error) {
        consoleWarn('Failed to new Worker', error)
        return null
      }
    }).filter(Boolean) as any,
    fontFamilies: new Set(),
    fontCssTexts: new Map(),
    acceptOfImage: `${[
      supportWebp(ownerDocument) && 'image/webp',
      'image/svg+xml',
      'image/*',
      '*/*',
      ].filter(Boolean).join(',')};q=0.8`,
    requests,
    drawImageCount: 0,
    tasks: [],
  }

  context.log.time('wait until load')
  await waitUntilLoad(node, context.timeout)
  context.log.timeEnd('wait until load')

  const { width, height } = resolveBoundingBox(node, context)
  context.width = width
  context.height = height

  return context
}

function destroyContext(context: Context) {
  context.ownerDocument = undefined
  context.ownerWindow = undefined
  context.svgStyleElement = undefined
  context.svgDefsElement = undefined
  context.svgStyles.clear()
  context.defaultComputedStyles.clear()
  if (context.sandbox) {
    try {
      context.sandbox.remove()
    }
    catch (err) {
      //
    }
    context.sandbox = undefined
  }
  context.workers = []
  context.fontFamilies.clear()
  context.fontCssTexts.clear()
  context.requests.clear()
  context.tasks = []
}

async function appendChildNode<T extends Node>(
  cloned: T,
  child: ChildNode | HTMLSlotElement,
  context: Context,
): Promise<void> {
  if (isElementNode(child) && (isStyleElement(child) || isScriptElement(child)))
    return

  if (context.filter && !context.filter(child))
    return

  cloned.appendChild(await cloneNode(child, context))
}

async function cloneChildNodes<T extends Node>(
  node: T,
  cloned: T,
  context: Context,
): Promise<void> {
  const firstChild = (isElementNode(node) ? node.shadowRoot?.firstChild : undefined) ?? node.firstChild

  for (let child = firstChild; child; child = child.nextSibling) {
    if (isCommentNode(child))
      continue
    if (
      isElementNode(child)
      && isSlotElement(child)
      && typeof child.assignedNodes === 'function'
    ) {
      const nodes = child.assignedNodes()
      for (let i = 0; i < nodes.length; i++)
        await appendChildNode(cloned, nodes[i] as ChildNode, context)
    }
    else {
      await appendChildNode(cloned, child, context)
    }
  }
}

function applyCssStyleWithOptions(
  cloned: HTMLElement | SVGElement,
  context: Context,
) {
  const { backgroundColor, width, height, style: styles } = context
  const clonedStyle = cloned.style
  if (backgroundColor)
    clonedStyle.setProperty('background-color', backgroundColor)
  if (width)
    clonedStyle.setProperty('width', `${width}px`)
  if (height)
    clonedStyle.setProperty('height', `${height}px`)
  if (styles)
    for (const name in styles) clonedStyle[name] = styles[name]!
}

async function cloneNode<T extends Node>(
  node: T,
  context: Context,
  isRoot = false,
): Promise<Node> {
  const { ownerDocument, ownerWindow, fontFamilies } = context

  if (ownerDocument && isTextNode(node))
    return ownerDocument.createTextNode(node.data)

  if (
    ownerDocument
    && ownerWindow
    && isElementNode(node)
    && (isHTMLElementNode(node) || isSVGElementNode(node))
  ) {
    const cloned = await cloneElement(node, context)

    // fix abnormal attribute
    cloned.removeAttribute('"')

    const diffStyle = copyCssStyles(node, cloned, isRoot, context)

    if (isRoot)
      applyCssStyleWithOptions(cloned, context)

    const overflow = [
      diffStyle.get('overflow-x')?.[0],
      diffStyle.get('overflow-y')?.[1],
    ]

    // copyPseudoClass(
    //   node,
    //   cloned,
    //   // copy scrollbar
    //   (overflow.includes('scroll'))
    //   || (
    //     (overflow.includes('auto') || overflow.includes('overlay'))
    //     && (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth)
    //   ),
    //   context,
    // )

    diffStyle.get('font-family')?.[0]
      .split(',')
      .filter(Boolean)
      .map(val => val.toLowerCase())
      .forEach(val => fontFamilies.add(val))

    if (!isVideoElement(node))
      await cloneChildNodes(node, cloned, context)

    return cloned
  }

  const cloned = node.cloneNode(false)

  await cloneChildNodes(node, cloned, context)

  return cloned
}

function embedNode<T extends Node>(clone: T, context: Context) {
  const { tasks } = context

  if (isElementNode(clone)) {
    if (isImageElement(clone) || isSVGImageElementNode(clone))
      tasks.push(...embedImageElement(clone, context))
  }

  if (isHTMLElementNode(clone))
    tasks.push(...embedCssStyleImage(clone.style, context))

  clone.childNodes.forEach((child) => {
    embedNode(child, context)
  })
}

async function embedWebFont<T extends Element>(
  clone: T,
  context: Context,
) {
  const {
    ownerDocument,
    svgStyleElement,
    fontFamilies,
    fontCssTexts,
    tasks,
    font,
  } = context

  if (
    !ownerDocument
    || !svgStyleElement
    || !fontFamilies.size
  ) return

  if (font && font.cssText) {
    const cssText = filterPreferredFormat(font.cssText, context)
    svgStyleElement.appendChild(ownerDocument.createTextNode(`${cssText}\n`))
  }
  else {
    const styleSheets = Array.from(ownerDocument.styleSheets).filter((styleSheet) => {
      try {
        return 'cssRules' in styleSheet && Boolean(styleSheet.cssRules.length)
      }
      catch (error) {
        consoleWarn(`Error while reading CSS rules from ${styleSheet.href}`, error)
        return false
      }
    })

    await Promise.all(
      styleSheets.flatMap((styleSheet) => {
        return Array.from(styleSheet.cssRules).map(async (cssRule, index) => {
          if (isCSSImportRule(cssRule)) {
            let importIndex = index + 1
            const baseUrl = cssRule.href
            let cssText = ''
            try {
              cssText = await contextFetch(context, {
                url: baseUrl,
                requestType: 'text',
                responseType: 'text',
              })
            }
            catch (error) {
              consoleWarn(`Error fetch remote css import from ${baseUrl}`, error)
            }
            const replacedCssText = cssText.replace(
              URL_RE,
              (raw, quotation, url) => raw.replace(url, resolveUrl(url, baseUrl)),
            )
            for (const rule of parseCss(replacedCssText)) {
              try {
                styleSheet.insertRule(rule, (rule.startsWith('@import')) ? (importIndex += 1) : styleSheet.cssRules.length!)
              }
              catch (error) {
                consoleWarn('Error inserting rule from remote css import', { rule, error })
              }
            }
          }
        })
      }),
    )

    const cssRules = styleSheets.flatMap(styleSheet => Array.from(styleSheet.cssRules))

    cssRules
      .filter(cssRule => (
        isCssFontFaceRule(cssRule)
        && hasCssUrl(cssRule.style.getPropertyValue('src'))
        && cssRule.style.getPropertyValue('font-family')
          .split(',')
          .filter(Boolean)
          .map(val => val.toLowerCase())
          .some(val => fontFamilies.has(val))
      ))
      .forEach((value) => {
        const rule = value as CSSFontFaceRule
        const cssText = fontCssTexts.get(rule.cssText)
        if (cssText) {
          svgStyleElement.appendChild(ownerDocument.createTextNode(`${cssText}\n`))
        }
        else {
          tasks.push(
            replaceCssUrlToDataUrl(
              rule.cssText,
              rule.parentStyleSheet ? rule.parentStyleSheet.href : null,
              context,
            ).then((cssText) => {
              cssText = filterPreferredFormat(cssText, context)
              fontCssTexts.set(rule.cssText, cssText)
              svgStyleElement.appendChild(ownerDocument.createTextNode(`${cssText}\n`))
            }),
          )
        }
      })
  }
}

function parseCss(source: string) {
  if (source == null)
    return []
  const result: string[] = []
  let cssText = source.replace(COMMENTS_RE, '')
  while (true) {
    const matches = KEYFRAMES_RE.exec(cssText)
    if (!matches)
      break
    result.push(matches[0])
  }
  cssText = cssText.replace(KEYFRAMES_RE, '')
  // to match css & media queries together
  const IMPORT_RE = /@import[\s\S]*?url\([^)]*\)[\s\S]*?;/gi
  const UNIFIED_RE = new RegExp(
    '((\\s*?(?:\\/\\*[\\s\\S]*?\\*\\/)?\\s*?@media[\\s\\S]'
    + '*?){([\\s\\S]*?)}\\s*?})|(([\\s\\S]*?){([\\s\\S]*?)})',
    'gi',
  )
  while (true) {
    let matches = IMPORT_RE.exec(cssText)
    if (!matches) {
      matches = UNIFIED_RE.exec(cssText)
      if (!matches)
        break
      else
        IMPORT_RE.lastIndex = UNIFIED_RE.lastIndex
    }
    else {
      UNIFIED_RE.lastIndex = IMPORT_RE.lastIndex
    }
    result.push(matches[0])
  }
  return result
}

function filterPreferredFormat(
  str: string,
  context: Context,
): string {
  const { font } = context

  const preferredFormat = font ? font?.preferredFormat : undefined

  return preferredFormat
    ? str.replace(FONT_SRC_RE, (match: string) => {
      while (true) {
        const [src, , format] = URL_WITH_FORMAT_RE.exec(match) || []
        if (!format)
          return ''
        if (format === preferredFormat)
          return `src: ${src};`
      }
    })
    : str
}

function getDefaultRequestInit(bypassingCache?: boolean): RequestInit {
  return {
    cache: bypassingCache ? 'no-cache' : 'force-cache',
  }
}

function createLogger(debug: boolean) {
  return {
    time: (label: string) => debug && consoleTime(label),
    timeEnd: (label: string) => debug && consoleTimeEnd(label),
    warn: (...args: any[]) => debug && consoleWarn(...args),
  }
}

function resolveUrl(url: string, baseUrl: string | null): string {
  // url is absolute already
  if (url.match(/^[a-z]+:\/\//i))
    return url

  // url is absolute already, without protocol
  if (IN_BROWSER && url.match(/^\/\//))
    return window.location.protocol + url

  // dataURI, mailto:, tel:, etc.
  if (url.match(/^[a-z]+:/i))
    return url

  if (!IN_BROWSER)
    return url

  const doc = getDocument().implementation.createHTMLDocument()
  const base = doc.createElement('base')
  const a = doc.createElement('a')
  doc.head.appendChild(base)
  doc.body.appendChild(a)
  if (baseUrl)
    base.href = baseUrl
  a.href = url
  return a.href
}

function createSvg(width: number, height: number, ownerDocument?: Document | null): SVGSVGElement {
  const svg = getDocument(ownerDocument).createElementNS(XMLNS, 'svg')
  svg.setAttributeNS(null, 'width', width.toString())
  svg.setAttributeNS(null, 'height', height.toString())
  svg.setAttributeNS(null, 'viewBox', `0 0 ${width} ${height}`)
  return svg
}

// Blob to
function readBlob(blob: Blob, type: 'dataUrl'): Promise<string>
function readBlob(blob: Blob, type: 'arrayBuffer'): Promise<ArrayBuffer>
function readBlob(blob: Blob, type: 'dataUrl' | 'arrayBuffer') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.onabort = () => reject(new Error(`Failed read blob to ${type}`))
    if (type === 'dataUrl')
      reader.readAsDataURL(blob)
    else if (type === 'arrayBuffer')
      reader.readAsArrayBuffer(blob)
  })
}
const blobToDataUrl = (blob: Blob) => readBlob(blob, 'dataUrl')

interface LoadMediaOptions {
  ownerDocument?: Document
  timeout?: number
  onError?: (error: Error) => void
}

async function waitUntilLoad(node: Node, timeout: number) {
  if (isHTMLElementNode(node)) {
    if (isImageElement(node) || isVideoElement(node)) {
      await loadMedia(node, { timeout })
    }
    else {
      await Promise.all(
        ['img', 'video'].flatMap((selectors) => {
          return Array.from(node.querySelectorAll(selectors))
            .map(el => loadMedia(el as any, { timeout }))
        }),
      )
    }
  }
}

const uuid = (function uuid() {
  // generate uuid for className of pseudo elements.
  // We should not use GUIDs, otherwise pseudo elements sometimes cannot be captured.
  let counter = 0

  // ref: http://stackoverflow.com/a/6248722/2519373
  const random = () =>

    `0000${((Math.random() * 36 ** 4) << 0).toString(36)}`.slice(-4)

  return () => {
    counter += 1
    return `u${random()}${counter}`
  }
})()

function cloneImage<T extends HTMLImageElement>(
  image: T,
): HTMLImageElement {
  const cloned = image.cloneNode(false) as T

  if (image.currentSrc && image.currentSrc !== image.src) {
    cloned.src = image.currentSrc
    cloned.srcset = ''
  }

  if (cloned.loading === 'lazy')
    cloned.loading = 'eager'

  return cloned
}

function cloneCanvas<T extends HTMLCanvasElement>(
  canvas: T,
): HTMLCanvasElement | HTMLImageElement {
  if (canvas.ownerDocument) {
    try {
      const dataURL = canvas.toDataURL()
      if (dataURL !== 'data:,')
        return createImage(dataURL, canvas.ownerDocument)
    }
    catch (error) {
      //
    }
  }

  const cloned = canvas.cloneNode(false) as T
  const ctx = canvas.getContext('2d')
  const clonedCtx = cloned.getContext('2d')

  try {
    if (ctx && clonedCtx) {
      clonedCtx.putImageData(
        ctx.getImageData(0, 0, canvas.width, canvas.height),
        0, 0,
      )
    }
    return cloned
  }
  catch (error) {
    consoleWarn('Failed to clone canvas', error)
  }

  return cloned
}

async function cloneVideo<T extends HTMLVideoElement>(
  video: T,
): Promise<HTMLCanvasElement | HTMLImageElement | HTMLVideoElement> {
  if (
    video.ownerDocument
    && !video.currentSrc
    && video.poster
  )
    return createImage(video.poster, video.ownerDocument)

  const cloned = video.cloneNode(false) as T
  cloned.crossOrigin = 'anonymous'
  if (video.currentSrc && video.currentSrc !== video.src)
    cloned.src = video.currentSrc

  // video to canvas
  const ownerDocument = cloned.ownerDocument
  if (ownerDocument) {
    let canPlay = true
    await loadMedia(cloned, {
      onError: () => canPlay = false,
    })
    if (!canPlay) {
      if (video.poster)
        return createImage(video.poster, video.ownerDocument)

      return cloned
    }
    cloned.currentTime = video.currentTime
    await new Promise((resolve) => {
      cloned.addEventListener('seeked', resolve, { once: true })
    })
    const canvas = ownerDocument.createElement('canvas')
    canvas.width = video.offsetWidth
    canvas.height = video.offsetHeight
    try {
      const ctx = canvas.getContext('2d')
      if (ctx)
        ctx.drawImage(cloned, 0, 0, canvas.width, canvas.height)
    }
    catch (error) {
      consoleWarn('Failed to clone video', error)
      if (video.poster)
        return createImage(video.poster, video.ownerDocument)

      return cloned
    }
    return cloneCanvas(canvas)
  }

  return cloned
}

function cloneElement<T extends HTMLElement | SVGElement>(
  node: T,
  // context: Context,
): (HTMLElement | SVGElement) | Promise<HTMLElement | SVGElement> {
  // if (isCanvasElement(node)) {
  //   return cloneCanvas(node)
  // }

  // if (isIFrameElement(node)) {
  //   return cloneIframe(node, context)
  // }

  ////////////////////////////////////////
  for (const attr of node.attributes) {
    if (attr.localName.includes(':'))
      node.removeAttribute(attr.localName)

    if (attr.name.includes(':')) {
      // console.debug(attr.name)
      node.removeAttribute(attr.name)
    }
  }

  const otherAttributesToRemove = ['data-v-inspector', 'xl:mt-4', 'sm:font-medium', 'sm:break-words', 'hover:bg-active', 'focus:ring', 'focus:outline-none']
  for (const attrName of otherAttributesToRemove) {
    try {
      node.removeAttribute(attrName)
    }
    catch (e) {
      consoleWarn((e as Error).message)
    }
  }

  // console.log(node)

  // if (node.getAttribute('src')?.includes('svg')) {
  //   console.log(node.getAttribute('src')?.includes('svg'))
  //   console.log(node.getAttribute('src')?.includes('data:image/svg+xml'))
  // } else {
  //   // console.log(node.innerHTML)
  // }

  // if(node.getAttribute('src')?.includes('data:image/svg+xml')) {
  //   const link = document.createElement('')
  //   return link
  // }
  ////////////////////////////////////

  if (isImageElement(node))
    return cloneImage(node)

  if (isVideoElement(node))
    return cloneVideo(node)

  // if (isSVGSVGElementNode(node)) {
  //   return cloneSvg(node, context)
  // }

  return node.cloneNode(false) as T
}

function copyCssStyles<T extends HTMLElement | SVGElement>(
  node: T,
  cloned: T,
  isRoot: boolean,
  context: Context,
) {
  const { ownerWindow } = context
  const clonedStyle = cloned.style
  const computedStyle = ownerWindow!.getComputedStyle(node)
  const defaultStyle = getDefaultStyle(node, null, context)
  const diffStyle = getDiffStyle(computedStyle, defaultStyle)

  // fix
  diffStyle.delete('transition-property')
  diffStyle.delete('all') // svg: all
  diffStyle.delete('d') // svg: d
  diffStyle.delete('content') // Safari shows pseudoelements if content is set
  if (isRoot) {
    diffStyle.delete('margin-top')
    diffStyle.delete('margin-right')
    diffStyle.delete('margin-bottom')
    diffStyle.delete('margin-left')
    diffStyle.delete('margin-block-start')
    diffStyle.delete('margin-block-end')
    diffStyle.delete('margin-inline-start')
    diffStyle.delete('margin-inline-end')
    diffStyle.set('box-sizing', ['border-box', ''])
  }
  // fix background-clip: text
  if (diffStyle.get('background-clip')?.[0] === 'text')
    cloned.classList.add('______background-clip--text')

  // fix chromium
  // https://github.com/RigoCorp/html-to-image/blob/master/src/cssFixes.ts
  if (IN_CHROME) {
    if (!diffStyle.has('font-kerning'))
      diffStyle.set('font-kerning', ['normal', ''])

    if (
      (
        diffStyle.get('overflow-x')?.[0] === 'hidden'
        || diffStyle.get('overflow-y')?.[0] === 'hidden'
      )
      && diffStyle.get('text-overflow')?.[0] === 'ellipsis'
      && node.scrollWidth === node.clientWidth
    )
      diffStyle.set('text-overflow', ['clip', ''])
  }

  diffStyle.forEach(([value, priority], name) => {
    clonedStyle.setProperty(name, value, priority)
  })

  return diffStyle
}

// function copyPseudoClass<T extends HTMLElement | SVGElement>(
//   node: T,
//   cloned: T,
//   copyScrollbar: boolean,
//   context: Context,
//   ) {
//   const { ownerWindow, svgStyleElement } = context

//   if (!svgStyleElement || !ownerWindow) return;
// }

const ignoredStyles = [
  'width',
  'height',
]

const includedAttributes = [
  'stroke',
  'fill',
]

// function cloneIframe<T extends HTMLIFrameElement>(
//   iframe: T,
//   context: Context,
//   ): HTMLIFrameElement | Promise<HTMLBodyElement> {
//   try {
//     if (iframe?.contentDocument?.body) {
//       return cloneNode(iframe.contentDocument.body, context) as Promise<HTMLBodyElement>
//     }
//   } catch (error) {
//     consoleWarn('Failed to clone iframe', error)
//   }

//   return iframe.cloneNode(false) as HTMLIFrameElement
// }

function getDefaultStyle(
  node: HTMLElement | SVGElement,
  pseudoElement: string | null,
  context: Context,
): Map<string, any> {
  const { defaultComputedStyles, ownerDocument } = context

  const nodeName = node.nodeName.toLowerCase()
  const isSvgNode = isSVGElementNode(node) && nodeName !== 'svg'
  const attributes = isSvgNode
    ? includedAttributes
      .map(name => [name, node.getAttribute(name)])
      .filter(([, value]) => value !== null)
    : []

  const key = [
    isSvgNode && 'svg',
    nodeName,
    attributes.map((name, value) => `${name}=${value}`).join(','),
    pseudoElement,
  ]
    .filter(Boolean)
    .join(':')

  if (defaultComputedStyles.has(key))
    return defaultComputedStyles.get(key)!

  let sandbox = context.sandbox
  if (!sandbox) {
    try {
      if (ownerDocument) {
        sandbox = ownerDocument.createElement('iframe')
        sandbox.id = `__SANDBOX__-${uuid()}`
        sandbox.width = '0'
        sandbox.height = '0'
        sandbox.style.visibility = 'hidden'
        sandbox.style.position = 'fixed'
        ownerDocument.body.appendChild(sandbox)
        sandbox.contentWindow?.document.write('<!DOCTYPE html><meta charset="UTF-8"><title></title><body>')
        context.sandbox = sandbox
      }
    }
    catch (error) {
      consoleWarn('Failed to create iframe sandbox', error)
    }
  }
  if (!sandbox)
    return new Map()

  const sandboxWindow = sandbox.contentWindow
  if (!sandboxWindow)
    return new Map()
  const sandboxDocument = sandboxWindow.document

  let root: HTMLElement | SVGSVGElement
  let el: Element
  if (isSvgNode) {
    root = sandboxDocument.createElementNS(XMLNS, 'svg')
    el = root.ownerDocument.createElementNS(root.namespaceURI, nodeName)
    attributes.forEach(([name, value]) => {
      el.setAttributeNS(null, name!, value!)
    })
    root.appendChild(el)
  }
  else {
    root = el = sandboxDocument.createElement(nodeName)
  }
  el.textContent = ' '
  sandboxDocument.body.appendChild(root)
  const computedStyle = sandboxWindow.getComputedStyle(el, pseudoElement)
  const styles = new Map<string, any>()
  for (let len = computedStyle.length, i = 0; i < len; i++) {
    const name = computedStyle.item(i)
    if (ignoredStyles.includes(name))
      continue
    styles.set(name, computedStyle.getPropertyValue(name))
  }
  sandboxDocument.body.removeChild(root)

  defaultComputedStyles.set(key, styles)

  return styles
}

function embedImageElement<T extends HTMLImageElement | SVGImageElement>(
  clone: T,
  context: Context,
): Promise<void>[] {
  if (isImageElement(clone)) {
    const originalSrc = clone.currentSrc || clone.src

    if (!isDataUrl(originalSrc)) {
      return [
        contextFetch(context, {
          url: originalSrc,
          imageDom: clone,
          requestType: 'image',
          responseType: 'dataUrl',
        }).then((url) => {
          if (!url)
            return
          clone.srcset = ''
          clone.dataset.originalSrc = originalSrc
          clone.src = url || ''
        }),
      ]
    }

    if ((IN_SAFARI || IN_FIREFOX) && originalSrc.includes('data:image/svg+xml'))
      context.drawImageCount++
  }
  else if (isSVGElementNode(clone) && !isDataUrl(clone.href.baseVal)) {
    const originalSrc = clone.href.baseVal
    return [
      contextFetch(context, {
        url: originalSrc,
        imageDom: clone,
        requestType: 'image',
        responseType: 'dataUrl',
      }).then((url) => {
        if (!url)
          return
        clone.dataset.originalSrc = originalSrc
        clone.href.baseVal = url || ''
      }),
    ]
  }
  return []
}

const properties = [
  'background-image',
  'border-image-source',
  '-webkit-border-image',
  '-webkit-mask-image',
  'list-style-image',
]

function embedCssStyleImage(
  style: CSSStyleDeclaration,
  context: Context,
): Promise<void>[] {
  return properties
    .map((property) => {
      const value = style.getPropertyValue(property)
      if (!value)
        return null

      if ((IN_SAFARI || IN_FIREFOX) && value.includes('data:image/svg+xml'))
        context.drawImageCount++

      return replaceCssUrlToDataUrl(value, null, context, true).then((newValue) => {
        if (!newValue || value === newValue)
          return
        style.setProperty(
          property,
          newValue,
          style.getPropertyPriority(property),
        )
      })
    })
    .filter(Boolean) as Promise<void>[]
}

interface Request {
  type: 'image' | 'text'
  resolve?: (response: string) => void
  reject?: (error: Error) => void
  response: Promise<string>
}

type BaseFetchOptions = RequestInit & {
  url: string
  timeout?: number
  responseType?: 'text' | 'dataUrl'
}

type ContextFetchOptions = BaseFetchOptions & {
  requestType?: 'text' | 'image'
  imageDom?: HTMLImageElement | SVGImageElement
}

function baseFetch(options: BaseFetchOptions): Promise<string> {
  const { url, timeout, responseType, ...requestInit } = options

  const controller = new AbortController()

  const timer = timeout ? setTimeout(() => controller.abort(), timeout) : undefined

  return fetch(url, { signal: controller.signal, ...requestInit })
    .then((response) => {
      if (!response.ok)
        throw new Error('Failed fetch, not 2xx response', { cause: response })

      switch (responseType) {
        case 'dataUrl':
          return response.blob().then(blobToDataUrl)
        case 'text':
        default:
          return response.text()
      }
    })
    .finally(() => clearTimeout(timer))
}

function contextFetch(context: Context, options: ContextFetchOptions) {
  const { url: rawUrl, requestType = 'text', responseType = 'text', imageDom } = options
  let url = rawUrl

  const {
    timeout,
    acceptOfImage,
    requests,
    fetch: {
      requestInit,
      bypassingCache,
      placeholderImage,
    },
    workers,
  } = context

  let request: Request

  if (!requests.has(rawUrl)) {
    // cache bypass so we dont have CORS issues with cached images
    // ref: https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache
    if (bypassingCache)
      url += (/\?/.test(url) ? '&' : '?') + new Date().getTime()

    if (requestType === 'image' && IN_SAFARI)
      context.drawImageCount++

    const baseFetchOptions: BaseFetchOptions = {
      url,
      timeout,
      responseType,
      headers: (requestType === 'image') ? { accept: acceptOfImage } : undefined,
      ...requestInit,
    }

    request = {
      type: requestType,
      resolve: undefined,
      reject: undefined,
      response: null as any,
    }

    request.response = (
      (!IN_SAFARI && rawUrl.startsWith('http') && workers.length)
        ? new Promise((resolve, reject) => {
          const worker = workers[requests.size & (workers.length - 1)]
          worker.postMessage({ rawUrl, ...baseFetchOptions })
          request.resolve = resolve
          request.reject = reject
        })
        : baseFetch(baseFetchOptions)
    ).catch((error) => {
      requests.delete(rawUrl)

      if (requestType === 'image' && placeholderImage) {
        consoleWarn('Failed to fetch image base64, trying to use placeholder image', url)
        return typeof placeholderImage === 'string'
          ? placeholderImage
          : placeholderImage(imageDom!)
      }

      throw error
    }) as any

    requests.set(rawUrl, request)
  }
  else {
    request = requests.get(rawUrl)!
  }

  return request.response
}

async function replaceCssUrlToDataUrl(
  cssText: string,
  baseUrl: string | null,
  context: Context,
  isImage?: boolean,
): Promise<string> {
  if (!hasCssUrl(cssText))
    return cssText

  for (const [rawUrl, url] of parseCssUrls(cssText, baseUrl)) {
    try {
      const dataUrl = await contextFetch(
        context,
        {
          url,
          requestType: isImage ? 'image' : 'text',
          responseType: 'dataUrl',
        },
      )
      cssText = cssText.replace(toRE(rawUrl), `$1${dataUrl}$3`)
    }
    catch (error) {
      consoleWarn('Failed to fetch css data url', rawUrl, error)
    }
  }

  return cssText
}

function hasCssUrl(cssText: string): boolean {
  return /url\((['"]?)([^'"]+?)\1\)/.test(cssText)
}

function parseCssUrls(cssText: string, baseUrl: string | null): [string, string][] {
  const result: [string, string][] = []

  cssText.replace(URL_RE, (raw, quotation, url) => {
    result.push([url, resolveUrl(url, baseUrl)])
    return raw
  })

  return result.filter(([url]) => !isDataUrl(url))
}

function toRE(url: string): RegExp {
  const escaped = url.replace(/([.*+?^${}()|\[\]\/\\])/g, '\\$1')
  return new RegExp(`(url\\(['"]?)(${escaped})(['"]?\\))`, 'g')
}

function getDiffStyle(
  style: CSSStyleDeclaration,
  defaultStyle: Map<string, string>,
) {
  const diffStyle = new Map<string, [string, string]>()
  const prefixs: string[] = []
  const prefixTree = new Map<string, Map<string, [string, string]>>()

  for (let len = style.length, i = 0; i < len; i++) {
    const name = style.item(i)
    const value = style.getPropertyValue(name)
    const priority = style.getPropertyPriority(name)

    const subIndex = name.lastIndexOf('-')
    const prefix = subIndex > -1 ? name.substring(0, subIndex) : undefined
    if (prefix) {
      let map = prefixTree.get(prefix)
      if (!map) {
        map = new Map()
        prefixTree.set(prefix, map)
      }
      map.set(name, [value, priority])
    }

    if (defaultStyle.get(name) === value && !priority)
      continue

    if (prefix)
      prefixs.push(prefix)
    else
      diffStyle.set(name, [value, priority])
  }

  for (let len = prefixs.length, i = 0; i < len; i++) {
    prefixTree.get(prefixs[i])
      ?.forEach((value, name) => diffStyle.set(name, value))
  }

  return diffStyle
}

type Context<T extends Node = Node> = InternalContext<T> & Required<Options>
interface Options {
  /**
   * Width in pixels to be applied to node before rendering.
   */
  width?: number

  /**
   * Height in pixels to be applied to node before rendering.
   */
  height?: number

  /**
   * A number between `0` and `1` indicating image quality (e.g. 0.92 => 92%) of the JPEG image.
   */
  quality?: number

  /**
   * A string indicating the image format. The default type is image/png; that type is also used if the given type isn't supported.
   */
  type?: string

  /**
   * The pixel ratio of captured image.
   *
   * DPI = 96 * scale
   *
   * default: 1
   */
  scale?: number

  /**
   * A string value for the background color, any valid CSS color value.
   */
  backgroundColor?: string | null

  /**
   * An object whose properties to be copied to node's style before rendering.
   */
  style?: Partial<CSSStyleDeclaration> | null

  /**
   * A function taking DOM node as argument. Should return `true` if passed
   * node should be included in the output. Excluding node means excluding
   * it's children as well.
   */
  filter?: ((el: Node) => boolean) | null

  /**
   * Maximum canvas size (pixels).
   *
   * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#maximum_canvas_size
   */
  maximumCanvasSize?: number

  /**
   * Load media timeout and fetch remote asset timeout (millisecond).
   *
   * default: 30000
   */
  timeout?: number

  /**
   * Embed assets progress.
   */
  progress?: ((current: number, total: number) => void) | null

  /**
   * Enable debug mode to view the execution time log.
   */
  debug?: boolean

  /**
   * The options of fetch resources.
   */
  fetch?: {
    /**
     * The second parameter of `window.fetch` RequestInit
     *
     * default: {
     *   cache: 'force-cache',
     * }
     */
    requestInit?: RequestInit

    /**
     * Set to `true` to append the current time as a query string to URL
     * requests to enable cache busting.
     *
     * default: false
     */
    bypassingCache?: boolean

    /**
     * A data URL for a placeholder image that will be used when fetching
     * an image fails. Defaults to an empty string and will render empty
     * areas for failed images.
     *
     * default: data:image/png;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7
     */
    placeholderImage?: string | ((cloned: HTMLImageElement | SVGImageElement) => string | Promise<string>)
  }

  /**
   * The options of fonts download and embed.
   */
  font?: false | {
    /**
     * The preferred font format. If specified all other font formats are ignored.
     */
    preferredFormat?: 'woff' | 'woff2' | 'truetype' | 'opentype' | 'embedded-opentype' | 'svg' | string

    /**
     * A CSS string to specify for font embeds. If specified only this CSS will
     * be present in the resulting image.
     */
    cssText?: string
  }

  /**
   * Canvas `drawImage` interval
   * is used to fix errors in decoding images in safari/webkit
   *
   * default: 100
   */
  drawImageInterval?: number

  /**
   * Web Worker script url
   */
  workerUrl?: string | null

  /**
   * Web Worker number
   */
  workerNumber?: number

  /**
   * Triggered after a node is cloned
   */
  onCloneNode?: ((cloend: Node) => void) | null

  /**
   * Triggered after a node is embed
   */
  onEmbedNode?: ((cloend: Node) => void) | null

  /**
   * Triggered after a ForeignObjectSvg is created
   */
  onCreateForeignObjectSvg?: ((svg: SVGSVGElement) => void) | null
}

interface InternalContext<T extends Node> {
  /**
   * FLAG
   */
  __CONTEXT__: true

  /**
   * Logger
   */
  log: {
    time: (label: string) => void
    timeEnd: (label: string) => void
    warn: (...args: any[]) => void
  }

  /**
   * Node
   */
  node: T

  /**
   * Owner document
   */
  ownerDocument?: Document

  /**
   * Owner window
   */
  ownerWindow?: Window

  /**
   * DPI
   *
   * scale === 1 ? null : 96 * scale
   */
  dpi: number | null

  /**
   * The `style` element under the root `svg` element
   */
  svgStyleElement?: HTMLStyleElement

  /**
   * The `defs` element under the root `svg` element
   */
  svgDefsElement?: SVGDefsElement

  /**
   * The `svgStyleElement` class styles
   *
   * Map<cssText, class[]>
   */
  svgStyles: Map<string, string[]>

  /**
   * The map of default `getComputedStyle` for all tagnames
   */
  defaultComputedStyles: Map<string, Map<string, any>>

  /**
   * The IFrame sandbox used to get the `defaultComputedStyles`
   */
  sandbox?: HTMLIFrameElement

  /**
   * Web Workers
   */
  workers: Worker[]

  /**
   * The set of `font-family` values for all cloend elements
   */
  fontFamilies: Set<string>

  /**
   * Map<CssUrl, DataUrl>
   */
  fontCssTexts: Map<string, string>

  /**
   * `headers.accept` to use when `window.fetch` fetches images
   */
  acceptOfImage: string

  /**
   * All requests for `fetch`
   */
  requests: Map<string, Request>

  /**
   * Canvas multiple draw image fix svg+xml image decoding in Safari and Firefox
   */
  drawImageCount: number

  /**
   * Wait for all tasks embedded in
   */
  tasks: Promise<void>[]

  /**
   * Automatically destroy context
   */
  autoDestruct: boolean
}

export async function domToCanvas<T extends Node>(node: T, options?: Options): Promise<HTMLCanvasElement>
export async function domToCanvas<T extends Node>(context: Context<T>): Promise<HTMLCanvasElement>
export async function domToCanvas(node: any, options?: any) {
  const context = await orCreateContext(node, options)
  const svg = await domToForeignObjectSvg(context)
  const dataUrl = svgToDataUrl(svg)
  if (!context.autoDestruct) {
    context.svgStyleElement = createStyleElement(context.ownerDocument)
    context.svgDefsElement = context.ownerDocument?.createElementNS(XMLNS, 'defs')
    context.svgStyles.clear()
  }
  const image = createImage(dataUrl, svg.ownerDocument)
  return await imageToCanvas(image, context)
}
