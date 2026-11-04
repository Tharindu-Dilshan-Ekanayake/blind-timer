import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'

import { useGame } from '../net/gameStore'
import { bubbles, localPlayer } from '../net/liveState'
import { Label } from './labels'
import { titleById } from './layout'
import { getSettings } from './quality'
import { useDisposable } from './useDisposable'

const NAME_Y = 2.05
/** Gap between the top of the head and the bottom of the name. */
const HEAD_GAP = 0.22
/** A head measurement older than this (ms) means the avatar isn't being drawn. */
const HEAD_FRESH_MS = 250
/** Higher = the tag catches up with the head faster (it eases, never jitters). */
const FOLLOW = 10
const _world = new Vector3()

/**
 * Top of the blocky stand-in drawn for players too far away to show in full (see
 * RemotePlayers), and for an avatar still loading: every one is the same size.
 */
const STAND_IN_TOP = 2.11

/**
 * Name (with win streak) above a player's head, plus their speech bubble: emotes,
 * "STOP! ✋", "So close! 😬"... Bubbles arrive through liveState, so a new one
 * redraws a canvas but never re-renders React.
 *
 * The tag floats just above the top of the head: `motionRef.current.headTop`, which
 * the avatar measures each frame it is drawn (tall avatars, big heads, hats, sitting,
 * dancing), or above the stand-in figure while it isn't.
 *
 * Place inside the player's group; distance is measured from the tag's world position.
 */
export function Nametag({ id, name, streak, title = '', isSelf = false, gate = null, motionRef = null }) {
  const ref = useRef(null)
  const seenVersion = useRef(0)
  /** The name's current height in this group (eased towards the head). */
  const nameY = useRef(NAME_Y)
  const labels = useDisposable(
    () => ({ name: new Label({ height: 0.28 }), bubble: new Label({ height: 0.34, urgent: true }) }),
    [],
  )

  useEffect(() => {
    labels.name.sprite.center.set(0.5, 0)
    labels.bubble.sprite.center.set(0.5, 0)
  }, [labels])

  useEffect(() => {
    const t = titleById(title)
    const lines = []
    if (t) lines.push({ text: t.name, size: 26, color: t.color, rainbow: Boolean(t.rainbow) })
    lines.push({ text: name, size: 34 })
    if (streak > 0) lines.push({ text: `🔥 ${streak}`, size: 24, color: '#ffd23d' })
    labels.name.set(lines)
  }, [labels, name, streak, title])

  useFrame((_state, delta) => {
    const self = ref.current
    if (!self) return

    const b = bubbles.get(id)
    if (b && b.version !== seenVersion.current) {
      seenVersion.current = b.version
      labels.bubble.set(b.text ? [{ text: b.text, size: 40 }] : [])
    }

    // In your own duel the VS bar shows both names and what they say; over-the-head
    // tags would pile up in the close two-shot. Spectators still see them.
    const match = useGame.getState().match
    if (match && (isSelf || id === match.opponent)) {
      labels.name.sprite.visible = false
      labels.bubble.sprite.visible = false
      return
    }

    const limit = getSettings().nameDistance
    self.getWorldPosition(_world)
    const d = isSelf ? 0 : Math.hypot(_world.x - localPlayer.position.x, _world.z - localPlayer.position.z)

    // Just above the head: measured while the avatar is drawn, else the stand-in's.
    const motion = motionRef?.current
    const measured = motion?.headAt && performance.now() - motion.headAt < HEAD_FRESH_MS
    const top = measured ? motion.headTop - _world.y : STAND_IN_TOP
    const target = Math.max(NAME_Y * 0.6, top + HEAD_GAP)
    nameY.current += (target - nameY.current) * Math.min(1, delta * FOLLOW)
    labels.name.sprite.position.y = nameY.current
    // `gate` limits tags to the nearest few players (each tag is a draw call); a
    // speech bubble close by (your duel opponent) always shows.
    const allowed = !gate || gate.show
    labels.name.sprite.visible = allowed && d < limit && !labels.name.empty
    labels.bubble.sprite.visible = Boolean(
      b && b.until > Date.now() && (allowed || d < 6) && d < limit * 1.5 && !labels.bubble.empty,
    )
    labels.bubble.sprite.position.y = nameY.current + labels.name.sprite.scale.y + 0.06
  })

  return (
    <group ref={ref}>
      <primitive object={labels.name.sprite} position={[0, NAME_Y, 0]} />
      <primitive object={labels.bubble.sprite} position={[0, NAME_Y + 0.5, 0]} />
    </group>
  )
}

export default Nametag
