import {
  waitForEvenAppBridge,
  TextContainerProperty,
  CreateStartUpPageContainer,
  TextContainerUpgrade,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk'
import cards from './cards.json'

type Card = {
  id: number
  kana: string
  romaji: string
  word: string
  wordR: string
  en: string
}

const CARDS = cards as Card[]
const KEY = 'g2-hiragana-index'
const FLIP_KEY = 'g2-hiragana-flip'

let i = Number(localStorage.getItem(KEY) || '0')
if (!Number.isFinite(i) || i < 0 || i >= CARDS.length) i = 0
let flipped = localStorage.getItem(FLIP_KEY) === '1'

function line(card: Card, flipped: boolean): string {
  const head = `${i + 1}/${CARDS.length}`
  if (!flipped) {
    return [
      '',
      '',
      `     ${card.kana}`,
      '',
      head,
      '',
      'tap flip · swipe next/prev · double-tap exit',
    ].join('\n')
  }
  return [
    card.kana,
    card.romaji,
    '',
    card.word,
    card.wordR,
    card.en,
    '',
    head,
    'tap flip · swipe next/prev · double-tap exit',
  ].join('\n')
}

function eventTypeOf(envelope?: { eventType?: OsEventTypeList }): OsEventTypeList | null {
  if (!envelope) return null
  return envelope.eventType ?? OsEventTypeList.CLICK_EVENT
}

const bridge = await waitForEvenAppBridge()

await bridge.createStartUpPageContainer(
  new CreateStartUpPageContainer({
    containerTotalNum: 1,
    textObject: [
      new TextContainerProperty({
        xPosition: 0,
        yPosition: 0,
        width: 576,
        height: 288,
        borderWidth: 0,
        borderColor: 5,
        paddingLength: 4,
        containerID: 1,
        containerName: 'main',
        content: line(CARDS[i], flipped),
        isEventCapture: 1,
      }),
    ],
  }),
)

function show() {
  if (i < 0) i = CARDS.length - 1
  if (i >= CARDS.length) i = 0
  localStorage.setItem(KEY, String(i))
  localStorage.setItem(FLIP_KEY, flipped ? '1' : '0')
  bridge.textContainerUpgrade(
    new TextContainerUpgrade({
      containerID: 1,
      containerName: 'main',
      content: line(CARDS[i], flipped),
    }),
  )
  status()
}

const phone = document.getElementById('status')
function status() {
  if (phone) phone.textContent = `${i + 1}/${CARDS.length} · ${CARDS[i].kana} ${flipped ? 'flipped' : ''}`
}
status()

const unsubscribe = bridge.onEvenHubEvent(event => {
  const sysType = eventTypeOf(event.sysEvent)
  const textType = eventTypeOf(event.textEvent)

  if (sysType === OsEventTypeList.DOUBLE_CLICK_EVENT || textType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
    bridge.shutDownPageContainer(1)
    return
  }

  if (sysType === OsEventTypeList.CLICK_EVENT || textType === OsEventTypeList.CLICK_EVENT) {
    flipped = !flipped
    show()
    return
  }

  if (textType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
    i += 1
    flipped = false
    show()
    return
  }
  if (textType === OsEventTypeList.SCROLL_TOP_EVENT) {
    i -= 1
    flipped = false
    show()
    return
  }

  if (sysType === OsEventTypeList.SYSTEM_EXIT_EVENT || sysType === OsEventTypeList.ABNORMAL_EXIT_EVENT) {
    unsubscribe()
  }
})
