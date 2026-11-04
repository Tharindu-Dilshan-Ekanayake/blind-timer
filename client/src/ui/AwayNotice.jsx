import { sfx } from '../audio/sfx'
import { DATA } from '../game/layout'
import { reportActivity, retryConnection } from '../net/api'
import { useGame } from '../net/gameStore'
import { useNow } from './format'

/**
 * Being away. Players who do nothing for DATA.afk.kickSec are removed from the server
 * so their place goes to someone who wants to play:
 *   - first a "Still there?" warning with a countdown (any tap or key clears it), then
 *   - once removed, a screen to jump back in: "Play again" finds a server with room.
 */
function StillThere({ kickAt }) {
  const now = useNow(250)
  const left = Math.max(0, Math.ceil((kickAt - now) / 1000))
  return (
    <div className="pointer-events-auto absolute inset-0 z-[65] flex items-center justify-center bg-black/45">
      <div
        role="alertdialog"
        aria-labelledby="afk-title"
        className="ui-panel pop-in flex w-[min(90vw,24rem)] flex-col items-center gap-2 px-5 py-4 text-center"
      >
        <div className="wiggle text-[2.8rem] leading-none">⏰</div>
        <h2 id="afk-title" className="stroke-text text-[1.8rem] font-bold leading-tight text-white">
          Still there?
        </h2>
        <p className="text-sm font-semibold leading-snug text-white/85">
          You&apos;ll be moved out of this server in{' '}
          <span className="font-bold text-[#ffcf4a]">{left}s</span> to make room for new players.
        </p>
        <button
          type="button"
          autoFocus
          onClick={() => {
            sfx.click()
            reportActivity()
          }}
          className="btn-3d press mt-1 w-full bg-gradient-to-b from-[#5dff5d] to-[#22c522] px-3 py-2 text-xl font-bold text-white"
        >
          <span className="stroke-text">I&apos;M HERE! 👋</span>
        </button>
      </div>
    </div>
  )
}

function RemovedForAway() {
  const connecting = useGame((s) => s.status === 'connecting')
  return (
    <div className="pointer-events-auto absolute inset-0 z-[66] flex items-center justify-center bg-black/60">
      <div className="ui-panel pop-in flex w-[min(90vw,26rem)] flex-col items-center gap-2 px-5 py-5 text-center">
        <div className="text-[3rem] leading-none">💤</div>
        <h2 className="stroke-text text-[1.8rem] font-bold leading-tight text-white">You were away</h2>
        <p className="text-sm font-semibold leading-snug text-white/85">
          Nothing happened for {Math.round(DATA.afk.kickSec / 60 * 10) / 10} minutes, so your place went to a new
          player. Your cash, chairs and progress are all saved.
        </p>
        <button
          type="button"
          disabled={connecting}
          onClick={() => {
            sfx.click()
            retryConnection()
          }}
          className="btn-3d press mt-2 w-full bg-gradient-to-b from-[#5dff5d] to-[#22c522] px-3 py-2 text-xl font-bold text-white disabled:opacity-60"
        >
          <span className="stroke-text">{connecting ? 'JOINING…' : 'PLAY AGAIN ▶'}</span>
        </button>
      </div>
    </div>
  )
}

export function AwayNotice() {
  const status = useGame((s) => s.status)
  const afk = useGame((s) => s.afk)
  const rejoining = useGame((s) => s.awayRejoin)
  // Stays up while "Play again" is joining, so the emptied world never shows.
  const removed = status === 'away' || (rejoining && (status === 'connecting' || status === 'offline'))
  if (removed) return <RemovedForAway />
  if (afk && status === 'online') return <StillThere kickAt={afk.kickAt} />
  return null
}

export default AwayNotice
