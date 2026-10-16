/**
 * Render Lab 纯函数的契约测试（`apps/docs/utils/render-lab.ts`）。
 *
 * 只测纯函数：WebGL 调用本身只能在真实浏览器里验收（jsdom 无 WebGL2 上下文，
 * 且 `apps/docs` 没有组件级测试环境），对应的验收口径写在
 * docs/design/explorer-layout.md §7 与 `render-lab-window.vue` 的注释里。
 */
import { describe, expect, it } from 'vitest'
import {
  RENDER_LAB_MAX_DPR,
  RENDER_LAB_POSITIONS,
  RENDER_LAB_TURN_MS,
  RENDER_LAB_VERTEX_COUNT,
  RENDER_LAB_VERTEX_STRIDE_FLOATS,
  renderLabBlend,
  renderLabPixelSize,
  renderLabRotation,
  renderLabRotationMatrix,
  renderLabVertexData,
} from '../render-lab'

describe('Render Lab：backing store 尺寸', () => {
  it('DPR 高于上限时夹到 RENDER_LAB_MAX_DPR', () => {
    const size = renderLabPixelSize(300, 200, 3)
    expect(size.dpr).toBe(RENDER_LAB_MAX_DPR)
    expect(size.width).toBe(600)
    expect(size.height).toBe(400)
  })

  it('DPR 低于 1 时抬到 1（避免 backing store 比 CSS 尺寸还小）', () => {
    expect(renderLabPixelSize(300, 200, 0.5).dpr).toBe(1)
  })

  it('尺寸四舍五入且至少 1×1（0 宽 canvas 会退化成 300×150 默认尺寸）', () => {
    expect(renderLabPixelSize(10.4, 10.6, 1)).toMatchObject({ width: 10, height: 11 })
    expect(renderLabPixelSize(0, 0, 2)).toMatchObject({ width: 1, height: 1 })
  })

  it('非有限输入退化为安全值（NaN / Infinity 不进 canvas 属性）', () => {
    expect(renderLabPixelSize(Number.NaN, Number.POSITIVE_INFINITY, Number.NaN)).toEqual({
      width: 1,
      height: 1,
      dpr: 1,
    })
  })
})

/** 向量点积（提到 describe 外层：不捕获任何闭包变量，避免每次调用重建） */
const dot = (a: number[], b: number[]): number =>
  a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0)

/** 两点距离（同上） */
const side = (p: number[], q: number[]): number =>
  Math.hypot((p[0] ?? 0) - (q[0] ?? 0), (p[1] ?? 0) - (q[1] ?? 0))

describe('Render Lab：旋转角与旋转矩阵', () => {
  it('旋转角按 RENDER_LAB_TURN_MS 取模（长跑不丢精度、切回来不跳圈）', () => {
    expect(renderLabRotation(0)).toBe(0)
    expect(renderLabRotation(RENDER_LAB_TURN_MS / 4)).toBeCloseTo(Math.PI / 2, 10)
    expect(renderLabRotation(RENDER_LAB_TURN_MS)).toBe(0)
    expect(renderLabRotation(RENDER_LAB_TURN_MS * 3 + RENDER_LAB_TURN_MS / 2)).toBeCloseTo(
      Math.PI,
      10,
    )
  })

  it('非有限时长按 0 处理（NaN 传进矩阵会让画布整块消失）', () => {
    expect(renderLabRotation(Number.NaN)).toBe(0)
    expect(renderLabRotation(Number.POSITIVE_INFINITY)).toBe(0)
  })

  it('旋转矩阵是正交矩阵（列单位正交、行列式 1）', () => {
    const angle = 0.7
    const m = renderLabRotationMatrix(angle)
    // 列主序：前三列是 (cos, sin, 0) / (-sin, cos, 0) / (0, 0, 1)
    // 逐分量比较而不是整体 toEqual：Float32Array 会做单精度舍入
    const expected = [
      Math.cos(angle),
      Math.sin(angle),
      0,
      -Math.sin(angle),
      Math.cos(angle),
      0,
      0,
      0,
      1,
    ]
    expected.forEach((value, index) => {
      expect(m[index] ?? Number.NaN).toBeCloseTo(value, 6)
    })
    const column = (index: number): number[] => [
      m[index * 3] ?? 0,
      m[index * 3 + 1] ?? 0,
      m[index * 3 + 2] ?? 0,
    ]
    // Float32 单精度舍入：正交性断言放宽到 1e-6（够严了，逻辑错误会差好几个数量级）
    const [c0, c1, c2] = [column(0), column(1), column(2)]
    for (const c of [c0, c1, c2]) {
      expect(dot(c, c)).toBeCloseTo(1, 6)
    }
    expect(dot(c0, c1)).toBeCloseTo(0, 6)
    expect(dot(c0, c2)).toBeCloseTo(0, 6)
    expect(dot(c1, c2)).toBeCloseTo(0, 6)
    const determinant =
      (c0[0] ?? 0) * ((c1[1] ?? 0) * (c2[2] ?? 0) - (c1[2] ?? 0) * (c2[1] ?? 0)) -
      (c1[0] ?? 0) * ((c0[1] ?? 0) * (c2[2] ?? 0) - (c0[2] ?? 0) * (c2[1] ?? 0)) +
      (c2[0] ?? 0) * ((c0[1] ?? 0) * (c1[2] ?? 0) - (c0[2] ?? 0) * (c1[1] ?? 0))
    expect(determinant).toBeCloseTo(1, 6)
  })

  it('旋转半圈时等价于取反（单位矩阵的镜像，验证方向没写反）', () => {
    const m = renderLabRotationMatrix(Math.PI)
    expect(m[0]).toBeCloseTo(-1, 6)
    expect(m[4]).toBeCloseTo(-1, 6)
  })
})

describe('Render Lab：三角形顶点数据', () => {
  it('顶点数与位置数组规模一致（3 顶点 × 2 分量）', () => {
    expect(RENDER_LAB_POSITIONS.length).toBe(RENDER_LAB_VERTEX_COUNT * 2)
  })

  it('顶点全部落在 NDC 安全区内（旋转到尖朝左右时顶点不被裁掉）', () => {
    for (const value of RENDER_LAB_POSITIONS) {
      expect(Math.abs(value)).toBeLessThanOrEqual(1)
    }
  })

  it('是正三角形且重心在原点（旋转时不会飘）', () => {
    const points = [0, 1, 2].map((index) => [
      RENDER_LAB_POSITIONS[index * 2] ?? 0,
      RENDER_LAB_POSITIONS[index * 2 + 1] ?? 0,
    ])
    const [a, b, c] = points as [number[], number[], number[]]
    // 顶点存进 Float32Array 会做单精度舍入，三边相等只需到 1e-6 量级
    expect(side(a, b)).toBeCloseTo(side(b, c), 6)
    expect(side(b, c)).toBeCloseTo(side(c, a), 6)
    const centroid = [
      ((a[0] ?? 0) + (b[0] ?? 0) + (c[0] ?? 0)) / 3,
      ((a[1] ?? 0) + (b[1] ?? 0) + (c[1] ?? 0)) / 3,
    ]
    expect(centroid[0]).toBeCloseTo(0, 6)
    expect(centroid[1]).toBeCloseTo(0, 6)
  })
})

describe('Render Lab：交错顶点数据（位置 + token 色）', () => {
  const colors = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ] as const

  it('每个顶点 5 个 float（x, y, r, g, b），总长度 = 顶点数 × 5', () => {
    const data = renderLabVertexData(colors)
    expect(data.length).toBe(RENDER_LAB_VERTEX_COUNT * RENDER_LAB_VERTEX_STRIDE_FLOATS)
    expect(RENDER_LAB_VERTEX_STRIDE_FLOATS).toBe(5)
  })

  it('颜色落在对应顶点上（不是错位一格）', () => {
    const data = renderLabVertexData(colors)
    for (let index = 0; index < RENDER_LAB_VERTEX_COUNT; index += 1) {
      const offset = index * RENDER_LAB_VERTEX_STRIDE_FLOATS
      expect(data[offset]).toBeCloseTo(RENDER_LAB_POSITIONS[index * 2] ?? 0, 10)
      expect(data[offset + 1]).toBeCloseTo(RENDER_LAB_POSITIONS[index * 2 + 1] ?? 0, 10)
      expect([data[offset + 2], data[offset + 3], data[offset + 4]]).toEqual([
        ...(colors[index] ?? []),
      ])
    }
  })

  it('颜色数量不足时补黑（缺 token 不会读越界）', () => {
    const data = renderLabVertexData([colors[0]])
    expect([data[7], data[8], data[9]]).toEqual([0, 0, 0])
  })

  it('中点色是同源色（不引入第三枚色值）', () => {
    expect(renderLabBlend([0, 0.5, 1], [1, 1, 0])).toEqual([0.5, 0.75, 0.5])
  })
})
