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
const MODE_KEY = 'g2-hiragana-mode'

let i = Number(localStorage.getItem(KEY) || '0')
if (!Number.isFinite(i) || i < 0 || i >= CARDS.length) i = 0
let flipped = false
let mode: 'seq' | 'rand' = (localStorage.getItem(MODE_KEY) as 'seq' | 'rand') || 'seq'
let order: number[] = CARDS.map((_, n) => n)
let big = true

function shuffle() {
  order = CARDS.map((_, n) => n)
  for (let a = order.length - 1; a > 0; a--) {
    const b = Math.floor(Math.random() * (a + 1))
    ;[order[a], order[b]] = [order[b], order[a]]
  }
  i = 0
}

function current(): Card {
  const idx = mode === 'rand' ? order[i] : i
  return CARDS[idx] || CARDS[0]
}

function line(card: Card, flipped: boolean): string {
  const head = `${i + 1}/${CARDS.length}  ${mode === 'rand' ? 'random' : 'order'}`
  if (!flipped) {
    if (big) {
      return [
        '',
        '',
        `          ${card.kana}`,
        '',
        `          ${card.kana}`,
        '',
        head,
        'tap flip · swipe next · menu for options',
      ].join('\n')
    }
    return [
      '',
      card.kana,
      '',
      head,
      'tap flip · swipe next',
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
    'tap flip · swipe next',
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
        content: line(current(), flipped),
        isEventCapture: 1,
      }),
    ],
    menuObject: {
      menuItems: [
        { itemName: 'Order', itemID: 1 },
        { itemName: 'Random', itemID: 2 },
        { itemName: 'Shuffle', itemID: 3 },
        { itemName: 'Big letter', itemID: 4 },
        { itemName: 'Small letter', itemID: 5 },
      ],
    },
  }),
)

function show() {
  if (i < 0) i = CARDS.length - 1
  if (i >= CARDS.length) i = 0
  localStorage.setItem(KEY, String(i))
  localStorage.setItem(MODE_KEY, mode)
  bridge.textContainerUpgrade(
    new TextContainerUpgrade({
      containerID: 1,
      containerName: 'main',
      content: line(current(), flipped),
    }),
  )
  const phone = document.getElementById('status')
  if (phone) phone.textContent = `${mode} ${i + 1}/${CARDS.length} ${current().kana}`
}

const unsubscribe = bridge.onEvenHubEvent(event => {
  const menuId = event.menuItemClickEvent?.itemID
  if (menuId) {
    if (menuId === 1) { mode = 'seq'; i = 0; flipped = false; show() }
    if (menuId === 2) { mode = 'rand'; shuffle(); flipped = false; show() }
    if (menuId === 3) { shuffle(); mode = 'rand'; flipped = false; show() }
    if (menuId === 4) { big = true; show() }
    if (menuId === 5) { big = false; show() }
    return
  }

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

show()
