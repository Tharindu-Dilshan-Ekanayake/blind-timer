import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import {
  CircleGeometry,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  Object3D,
} from 'three'

import {
  createCloudSeaTexture,
  createCrystalGeometry,
  createGearGeometry,
  createIslandRockGeometry,
  createRailingGeometry,
  crystalItems,
  GEAR_ITEMS,
} from './islandGeometry'
import { CRYSTALS, ISLAND_RADIUS, PLANTERS, RAIL_RADIUS, SKY_ISLANDS } from './layout'
import { useSettings } from './quality'
import { BRASS, CLOUD_SEA } from './sceneStyle'
import { useDisposable } from './useDisposable'

/**
 * Everything that makes the map a floating island: its rocky underside and the
 * little islands drifting round it (1 draw call), the brass railing round its rim
 * (1), the giant gears turning at its edge (1), the glowing crystals (1) and the sea
 * of clouds far below (1).
 */

const _obj = new Object3D()
const _color = new Color()
/** Gears turn this fast (radians per second), alternately one way and the other. */
const GEAR_SPEED = 0.25

/** The main island, then the sky islands: position and scale of each rock. */
const ROCKS = [
  { p: [0, -0.03, 0], s: ISLAND_RADIUS },
  ...SKY_ISLANDS.map(([x, y, z, s]) => ({ p: [x, y, z], s: s * ISLAND_RADIUS })),
]

/** Crystals round the edge, in the planters by the entrance and on each sky island. */
const CRYSTAL_ITEMS = [
  ...crystalItems(CRYSTALS),
  ...crystalItems(PLANTERS.flatMap(([x, z, , d]) => [[x, z - d / 4, 0.42, 0.5], [x, z + d / 4, 0.36, 0.5]])),
  ...crystalItems(SKY_ISLANDS.map(([x, y, z, s]) => [x, z, s * 9, y])),
]

export function Island() {
  const { shadows } = useSettings()
  const rockRef = useRef(null)
  const gearRef = useRef(null)
  const crystalRef = useRef(null)

  const res = useDisposable(() => {
    const sea = createCloudSeaTexture()
    return {
      sea,
      rock: createIslandRockGeometry(),
      rockMaterial: new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }),
      railing: createRailingGeometry(RAIL_RADIUS, BRASS.rail, BRASS.post),
      railingMaterial: new MeshPhongMaterial({ vertexColors: true, shininess: 70, specular: '#fff2c0' }),
      gear: createGearGeometry(),
      gearMaterial: new MeshPhongMaterial({ color: BRASS.gear, shininess: 60, specular: '#fff0c0' }),
      crystal: createCrystalGeometry(),
      crystalMaterial: new MeshBasicMaterial({ vertexColors: true }),
      seaGeometry: new CircleGeometry(900, 48).rotateX(-Math.PI / 2),
      seaMaterial: new MeshBasicMaterial({ map: sea }),
    }
  }, [])

  useLayoutEffect(() => {
    const rock = rockRef.current
    ROCKS.forEach(({ p, s }, i) => {
      _obj.position.set(p[0], p[1], p[2])
      _obj.rotation.set(0, i * 1.7, 0)
      _obj.scale.setScalar(s)
      _obj.updateMatrix()
      rock.setMatrixAt(i, _obj.matrix)
    })
    rock.instanceMatrix.needsUpdate = true
    rock.computeBoundingSphere()

    const crystals = crystalRef.current
    CRYSTAL_ITEMS.forEach(({ p, s, rx, rz, c }, i) => {
      _obj.position.set(p[0], p[1], p[2])
      _obj.rotation.set(rx, i * 0.9, rz)
      _obj.scale.setScalar(s)
      _obj.updateMatrix()
      crystals.setMatrixAt(i, _obj.matrix)
      crystals.setColorAt(i, _color.set(c))
    })
    crystals.instanceMatrix.needsUpdate = true
    crystals.instanceColor.needsUpdate = true
    crystals.computeBoundingSphere()
  }, [])

  useFrame(({ clock }) => {
    const gears = gearRef.current
    if (!gears) return
    const t = clock.elapsedTime
    GEAR_ITEMS.forEach(({ x, z, r, y, ry }, i) => {
      _obj.position.set(x, y, z)
      _obj.rotation.set(0, ry, t * GEAR_SPEED * (i % 2 ? -1 : 1) * (3 / r))
      _obj.scale.set(r, r, 1.4)
      _obj.updateMatrix()
      gears.setMatrixAt(i, _obj.matrix)
    })
    gears.instanceMatrix.needsUpdate = true
    // The clouds below drift slowly past.
    res.sea.offset.x = t * 0.004
  })

  return (
    <>
      <instancedMesh ref={rockRef} args={[res.rock, res.rockMaterial, ROCKS.length]} />
      <mesh geometry={res.railing} material={res.railingMaterial} castShadow={shadows} />
      <instancedMesh
        ref={gearRef}
        args={[res.gear, res.gearMaterial, GEAR_ITEMS.length]}
        castShadow={shadows}
        frustumCulled={false}
      />
      <instancedMesh ref={crystalRef} args={[res.crystal, res.crystalMaterial, CRYSTAL_ITEMS.length]} />
      <mesh geometry={res.seaGeometry} material={res.seaMaterial} position={[0, CLOUD_SEA.y, 0]} />
    </>
  )
}

export default Island
