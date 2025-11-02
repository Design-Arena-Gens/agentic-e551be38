"use client";

import RoguelikeBrickBreaker from "../components/RoguelikeBrickBreaker";

export default function Page() {
  return (
    <main
      style={{
        maxWidth: "1080px",
        width: "100%",
        background: "rgba(10, 18, 32, 0.82)",
        borderRadius: "24px",
        padding: "2rem",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45)",
        border: "1px solid rgba(120, 180, 255, 0.2)"
      }}
    >
      <h1>肉鸽打砖块 · 裂隙号角</h1>
      <p>
        使用方向键或 A / D 移动板子，空格键开始或重新开始。清除一层砖块后可选择一项随机强化，
        尽可能保持连击与护盾，挑战更高关卡，体验 Roguelike 风格的打砖块冒险。
      </p>
      <RoguelikeBrickBreaker />
    </main>
  );
}
