"use client";

import { useEffect, useRef } from "react";
import type p5Type from "p5";

export default function RoguelikeBrickBreaker() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let p5Instance: p5Type | null = null;
    let mounted = true;

    const init = async () => {
      const p5 = (await import("p5")).default;
      if (!mounted) {
        return;
      }

      const sketch = (p: p5Type) => {
        const WIDTH = 960;
        const HEIGHT = 540;
        const BASE_PADDLE_WIDTH = 120;
        const BASE_PADDLE_HEIGHT = 16;
        const BASE_BALL_SPEED = 6;

        type GameMode = "title" | "playing" | "upgrade" | "gameover";

        interface Upgrade {
          id: string;
          name: string;
          description: string;
          apply: () => void;
        }

        interface Brick {
          x: number;
          y: number;
          width: number;
          height: number;
          hp: number;
          color: p5Type.Color;
        }

        const game = {
          mode: "title" as GameMode,
          level: 1,
          lives: 3,
          score: 0,
          combo: 0,
          paddleWidth: BASE_PADDLE_WIDTH,
          paddleHeight: BASE_PADDLE_HEIGHT,
          paddleSpeed: 9,
          ballSpeed: BASE_BALL_SPEED,
          multiBallChance: 0,
          critChance: 0,
          slowFieldChance: 0,
          shieldCharges: 0,
          bricks: [] as Brick[],
          balls: [] as {
            x: number;
            y: number;
            vx: number;
            vy: number;
            radius: number;
            damage: number;
          }[],
          paddle: {
            x: WIDTH / 2,
            y: HEIGHT - 48
          },
          upgradesOwned: [] as string[],
          upgradeChoices: [] as Upgrade[],
          floatingTexts: [] as {
            text: string;
            x: number;
            y: number;
            life: number;
            color: p5Type.Color;
          }[]
        };

        const allUpgrades: Upgrade[] = [
          {
            id: "wider_paddle",
            name: "流光护盾",
            description: "板子宽度 +30%",
            apply: () => {
              game.paddleWidth *= 1.3;
            }
          },
          {
            id: "faster_paddle",
            name: "幻影操控",
            description: "移动速度 +25%",
            apply: () => {
              game.paddleSpeed *= 1.25;
            }
          },
          {
            id: "ball_speed",
            name: "怒焰之球",
            description: "球速 +15% 且伤害 +1",
            apply: () => {
              game.ballSpeed *= 1.15;
              game.balls.forEach((ball) => {
                ball.damage += 1;
                const speed = Math.hypot(ball.vx, ball.vy);
                const factor = (game.ballSpeed + 1) / speed;
                ball.vx *= factor;
                ball.vy *= factor;
              });
            }
          },
          {
            id: "crit",
            name: "暴击核心",
            description: "暴击概率 +10%，暴击造成额外 2 点伤害",
            apply: () => {
              game.critChance += 0.1;
            }
          },
          {
            id: "multiball",
            name: "裂变术式",
            description: "清空一行时有 30% 概率生成额外球",
            apply: () => {
              game.multiBallChance = Math.min(0.8, game.multiBallChance + 0.3);
            }
          },
          {
            id: "slow_field",
            name: "时间泡影",
            description: "板子附近存在减速力场",
            apply: () => {
              game.slowFieldChance = Math.min(1, game.slowFieldChance + 0.4);
            }
          },
          {
            id: "shield",
            name: "灵能护壳",
            description: "获得 2 层底部护盾抵挡掉球",
            apply: () => {
              game.shieldCharges += 2;
            }
          },
          {
            id: "combo",
            name: "连击共鸣",
            description: "连击上限加倍并转化为额外得分",
            apply: () => {
              game.combo *= 2;
            }
          }
        ];

        const createBrickColor = (hp: number) => {
          if (hp >= 4) return p.color(255, 104, 104);
          if (hp === 3) return p.color(255, 187, 92);
          if (hp === 2) return p.color(79, 215, 255);
          return p.color(146, 255, 129);
        };

        const resetBalls = (initialAngle?: number) => {
          const baseAngle = initialAngle ?? p.radians(p.random(35, 145));
          game.balls = [
            {
              x: WIDTH / 2,
              y: HEIGHT - 72,
              vx: Math.cos(baseAngle) * game.ballSpeed,
              vy: -Math.abs(Math.sin(baseAngle) * game.ballSpeed),
              radius: 10,
              damage: 1
            }
          ];
        };

        const generateLevel = () => {
          const rows = Math.min(6 + Math.floor(game.level / 2), 10);
          const cols = 13;
          const padding = 12;
          const brickWidth = (WIDTH - padding * 2) / cols - padding;
          const brickHeight = 24;

          game.bricks = [];
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              if (p.random() < 0.18 && row > 1) continue;
              const extraHp = p.random() < 0.35 ? 1 : 0;
              const hp = 1 + Math.floor(game.level / 2) + extraHp;
              const x = padding + col * (brickWidth + padding);
              const y = 80 + row * (brickHeight + padding);
              game.bricks.push({
                x,
                y,
                width: brickWidth,
                height: brickHeight,
                hp,
                color: createBrickColor(hp)
              });
            }
          }
        };

        const spawnFloatingText = (
          text: string,
          x: number,
          y: number,
          color: p5Type.Color
        ) => {
          game.floatingTexts.push({ text, x, y, life: 120, color });
        };

        const sampleUpgrades = () => {
          const available = allUpgrades.filter(
            (upgrade) => !game.upgradesOwned.includes(upgrade.id)
          );
          return p.shuffle(available).slice(0, Math.min(3, available.length));
        };

        const enterUpgradePhase = () => {
          game.mode = "upgrade";
          game.upgradeChoices = sampleUpgrades();
        };

        const resetRun = () => {
          game.level = 1;
          game.lives = 3;
          game.score = 0;
          game.combo = 0;
          game.paddleWidth = BASE_PADDLE_WIDTH;
          game.paddleHeight = BASE_PADDLE_HEIGHT;
          game.paddleSpeed = 9;
          game.ballSpeed = BASE_BALL_SPEED;
          game.multiBallChance = 0;
          game.critChance = 0;
          game.slowFieldChance = 0;
          game.shieldCharges = 0;
          game.upgradesOwned = [];
          generateLevel();
          resetBalls();
          game.mode = "playing";
        };

        const drawTitleScreen = () => {
          p.push();
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(44);
          p.fill(255);
          p.text("肉鸽打砖块：无尽裂隙", WIDTH / 2, HEIGHT / 2 - 120);
          p.textSize(20);
          p.fill(180);
          p.text("左右方向键 / A D 控制板子，按空格开始", WIDTH / 2, HEIGHT / 2 - 40);
          p.text("打完一层即可获取随机升级，坚持更久赢得更高评分", WIDTH / 2, HEIGHT / 2 + 10);
          p.text("连击越高得分越高，小心只剩 3 点生命。", WIDTH / 2, HEIGHT / 2 + 50);
          p.pop();
        };

        const drawHUD = () => {
          p.push();
          p.fill(255);
          p.textAlign(p.LEFT, p.TOP);
          p.textSize(18);
          p.text(`关卡: ${game.level}`, 20, 18);
          p.text(`生命: ${game.lives}`, 20, 46);
          p.text(`得分: ${game.score}`, 20, 74);
          p.text(`连击: ${game.combo}`, 20, 102);
          p.text(`护盾: ${game.shieldCharges}`, 20, 130);

          p.textAlign(p.RIGHT, p.TOP);
          p.text("已获得强化", WIDTH - 20, 18);
          p.textSize(15);
          game.upgradesOwned.forEach((upgradeId, index) => {
            const upgrade = allUpgrades.find((u) => u.id === upgradeId);
            if (!upgrade) return;
            p.text(`${index + 1}. ${upgrade.name}`, WIDTH - 20, 48 + index * 22);
          });
          p.pop();
        };

        const handleUpgradeSelection = (mouseX: number, mouseY: number) => {
          const cardWidth = 220;
          const cardHeight = 180;
          const startX = WIDTH / 2 - (cardWidth + 32);
          const startY = HEIGHT / 2 - cardHeight / 2;

          for (let i = 0; i < game.upgradeChoices.length; i++) {
            const x = startX + i * (cardWidth + 32);
            const y = startY;
            if (
              mouseX > x &&
              mouseX < x + cardWidth &&
              mouseY > y &&
              mouseY < y + cardHeight
            ) {
              const upgrade = game.upgradeChoices[i];
              upgrade.apply();
              game.upgradesOwned.push(upgrade.id);
              spawnFloatingText(
                `获得 ${upgrade.name}`,
                WIDTH / 2,
                HEIGHT / 2,
                p.color(255)
              );
              game.mode = "playing";
              game.level += 1;
              generateLevel();
              resetBalls(p.radians(p.random(35, 145)));
              return;
            }
          }
        };

        const splitBall = (x: number, y: number) => {
          if (p.random() > game.multiBallChance) return;
          const angleLeft = p.radians(p.random(210, 240));
          const angleRight = p.radians(p.random(300, 330));
          game.balls.push({
            x,
            y,
            vx: Math.cos(angleLeft) * game.ballSpeed,
            vy: Math.sin(angleLeft) * game.ballSpeed,
            radius: 10,
            damage: 1
          });
          game.balls.push({
            x,
            y,
            vx: Math.cos(angleRight) * game.ballSpeed,
            vy: Math.sin(angleRight) * game.ballSpeed,
            radius: 10,
            damage: 1
          });
          spawnFloatingText("裂变球！", x, y, p.color(120, 200, 255));
        };

        const slowBall = (ball: (typeof game.balls)[number]) => {
          if (p.random() > game.slowFieldChance) return;
          ball.vx *= 0.85;
          ball.vy *= 0.85;
          spawnFloatingText("时空缓滞", ball.x, ball.y, p.color(200, 120, 255));
        };

        const updatePaddle = () => {
          if (p.keyIsDown(p.LEFT_ARROW) || p.keyIsDown(65)) {
            game.paddle.x -= game.paddleSpeed;
          }
          if (p.keyIsDown(p.RIGHT_ARROW) || p.keyIsDown(68)) {
            game.paddle.x += game.paddleSpeed;
          }
          game.paddle.x = p.constrain(
            game.paddle.x,
            game.paddleWidth / 2,
            WIDTH - game.paddleWidth / 2
          );
        };

        const updateFloatingTexts = () => {
          for (let i = game.floatingTexts.length - 1; i >= 0; i--) {
            const text = game.floatingTexts[i];
            text.y -= 0.4;
            text.life -= 1;
            if (text.life <= 0) {
              game.floatingTexts.splice(i, 1);
            }
          }
        };

        const critDamage = () => {
          return p.random() < game.critChance ? 2 : 0;
        };

        const updateBricks = () => {
          for (const ball of game.balls) {
            for (let i = game.bricks.length - 1; i >= 0; i--) {
              const brick = game.bricks[i];
              if (
                ball.x + ball.radius > brick.x &&
                ball.x - ball.radius < brick.x + brick.width &&
                ball.y + ball.radius > brick.y &&
                ball.y - ball.radius < brick.y + brick.height
              ) {
                const overlapLeft = ball.x + ball.radius - brick.x;
                const overlapRight = brick.x + brick.width - (ball.x - ball.radius);
                const overlapTop = ball.y + ball.radius - brick.y;
                const overlapBottom = brick.y + brick.height - (ball.y - ball.radius);
                const minOverlap = Math.min(
                  overlapLeft,
                  overlapRight,
                  overlapTop,
                  overlapBottom
                );

                if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                  ball.vx *= -1;
                } else {
                  ball.vy *= -1;
                }

                const damage = ball.damage + 1 + critDamage();
                brick.hp -= damage;
                game.score += 50 + game.combo * 5;
                spawnFloatingText(
                  damage > ball.damage + 1 ? `暴击 -${damage}` : `-${damage}`,
                  brick.x + brick.width / 2,
                  brick.y + brick.height / 2,
                  p.color(255, 140, 140)
                );

                if (brick.hp <= 0) {
                  game.bricks.splice(i, 1);
                } else {
                  brick.color = createBrickColor(brick.hp);
                }
                break;
              }
            }
          }

          if (game.bricks.length === 0 && game.mode === "playing") {
            splitBall(WIDTH / 2, HEIGHT / 2);
            enterUpgradePhase();
          }
        };

        const updateBalls = () => {
          game.balls.forEach((ball) => {
            ball.x += ball.vx;
            ball.y += ball.vy;

            if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= WIDTH) {
              ball.vx *= -1;
              ball.x = p.constrain(ball.x, ball.radius, WIDTH - ball.radius);
            }
            if (ball.y - ball.radius <= 0) {
              ball.vy *= -1;
              ball.y = ball.radius;
            }

            const paddleLeft = game.paddle.x - game.paddleWidth / 2;
            const paddleRight = game.paddle.x + game.paddleWidth / 2;
            const paddleTop = game.paddle.y - game.paddleHeight / 2;
            const paddleBottom = game.paddle.y + game.paddleHeight / 2;

            if (
              ball.x > paddleLeft &&
              ball.x < paddleRight &&
              ball.y + ball.radius > paddleTop &&
              ball.y - ball.radius < paddleBottom &&
              ball.vy > 0
            ) {
              const hitPos = (ball.x - game.paddle.x) / (game.paddleWidth / 2);
              const bounceAngle = p.map(hitPos, -1, 1, p.radians(210), p.radians(-30));
              const speed = Math.max(game.ballSpeed, Math.hypot(ball.vx, ball.vy));
              ball.vx = Math.cos(bounceAngle) * speed;
              ball.vy = Math.sin(bounceAngle) * speed;
              slowBall(ball);
              game.combo += 1;
              spawnFloatingText(
                `连击 ${game.combo}`,
                ball.x,
                ball.y,
                p.color(255, 220, 120)
              );
            }
          });

          const remaining: typeof game.balls = [];
          for (const ball of game.balls) {
            if (ball.y - ball.radius > HEIGHT) {
              if (game.shieldCharges > 0) {
                game.shieldCharges -= 1;
                spawnFloatingText("护盾抵挡", WIDTH / 2, HEIGHT - 60, p.color(120, 255, 200));
                resetBalls();
                break;
              } else {
                continue;
              }
            }
            remaining.push(ball);
          }

          if (remaining.length === 0) {
            game.lives -= 1;
            game.combo = 0;
            if (game.lives <= 0) {
              game.mode = "gameover";
            } else {
              resetBalls();
            }
          } else {
            game.balls = remaining;
          }
        };

        const drawBricks = () => {
          for (const brick of game.bricks) {
            p.fill(brick.color);
            p.rect(brick.x, brick.y, brick.width, brick.height, 8);
            p.fill(255);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(14);
            p.text(`HP ${brick.hp}`, brick.x + brick.width / 2, brick.y + brick.height / 2);
          }
        };

        const drawBalls = () => {
          for (const ball of game.balls) {
            p.noStroke();
            p.fill(120, 210, 255);
            p.circle(ball.x, ball.y, ball.radius * 2);
            p.fill(255);
            p.circle(ball.x - 2, ball.y - 2, ball.radius);
          }
        };

        const drawPaddle = () => {
          p.fill(120, 150, 255);
          p.rectMode(p.CENTER);
          p.rect(
            game.paddle.x,
            game.paddle.y,
            game.paddleWidth,
            game.paddleHeight,
            12
          );
          if (game.shieldCharges > 0) {
            p.noFill();
            p.stroke(120, 240, 255);
            p.strokeWeight(3);
            p.rect(
              game.paddle.x,
              game.paddle.y + 16,
              game.paddleWidth * 1.4,
              game.paddleHeight,
              16
            );
            p.strokeWeight(1);
          }
          p.rectMode(p.CORNER);
          p.noStroke();
        };

        const drawUpgradeCards = () => {
          const cardWidth = 220;
          const cardHeight = 180;
          const startX = WIDTH / 2 - (cardWidth + 32);
          const startY = HEIGHT / 2 - cardHeight / 2;

          p.push();
          p.textAlign(p.CENTER, p.BOTTOM);
          p.textSize(26);
          p.fill(255);
          p.text("选择一项强化", WIDTH / 2, startY - 36);
          p.pop();

          for (let i = 0; i < game.upgradeChoices.length; i++) {
            const upgrade = game.upgradeChoices[i];
            const x = startX + i * (cardWidth + 32);
            const y = startY;
            const hover =
              p.mouseX > x &&
              p.mouseX < x + cardWidth &&
              p.mouseY > y &&
              p.mouseY < y + cardHeight;

            p.push();
            p.fill(hover ? p.color(255, 240, 200) : p.color(230, 235, 255, 220));
            p.stroke(hover ? p.color(255, 190, 120) : p.color(160, 180, 255));
            p.strokeWeight(hover ? 3 : 1);
            p.rect(x, y, cardWidth, cardHeight, 16);

            p.fill(40, 50, 90);
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(20);
            p.text(upgrade.name, x + cardWidth / 2, y + 16);
            p.textSize(14);
            p.text(upgrade.description, x + cardWidth / 2, y + 56, cardWidth - 24, cardHeight - 72);
            p.pop();
          }
        };

        const drawGameOver = () => {
          p.push();
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(40);
          p.fill(255, 120, 150);
          p.text("旅程结束", WIDTH / 2, HEIGHT / 2 - 80);
          p.textSize(24);
          p.fill(220);
          p.text(`最终得分: ${game.score}`, WIDTH / 2, HEIGHT / 2 - 20);
          p.text(`到达关卡: ${game.level}`, WIDTH / 2, HEIGHT / 2 + 20);
          p.fill(180);
          p.text("按空格重新开始", WIDTH / 2, HEIGHT / 2 + 80);
          p.pop();
        };

        p.setup = () => {
          p.createCanvas(WIDTH, HEIGHT);
          p.frameRate(60);
          resetBalls();
        };

        p.draw = () => {
          p.background(7, 15, 28);
          p.noStroke();
          p.fill(16, 32, 48, 200);
          p.rect(0, 0, WIDTH, HEIGHT);

          switch (game.mode) {
            case "title":
              drawTitleScreen();
              break;
            case "playing":
              updatePaddle();
              updateBalls();
              updateBricks();
              updateFloatingTexts();
              drawHUD();
              drawBricks();
              drawPaddle();
              drawBalls();
              break;
            case "upgrade":
              drawHUD();
              drawBricks();
              drawPaddle();
              drawBalls();
              drawUpgradeCards();
              break;
            case "gameover":
              drawHUD();
              drawGameOver();
              break;
          }

          for (const text of game.floatingTexts) {
            p.push();
            const alpha = p.map(text.life, 0, 120, 0, 255);
            const r = p.red(text.color);
            const g = p.green(text.color);
            const b = p.blue(text.color);
            p.fill(r, g, b, alpha);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(16);
            p.text(text.text, text.x, text.y);
            p.pop();
          }
        };

        p.mousePressed = () => {
          if (game.mode === "upgrade") {
            handleUpgradeSelection(p.mouseX, p.mouseY);
          }
        };

        p.keyPressed = () => {
          if (p.key === " " || p.key === "Enter") {
            if (game.mode === "title" || game.mode === "gameover") {
              resetRun();
            }
          }
        };
      };

      p5Instance = new p5(sketch, containerRef.current ?? undefined);
    };

    void init();

    return () => {
      mounted = false;
      if (p5Instance) {
        p5Instance.remove();
        p5Instance = null;
      }
    };
  }, []);

  return <div ref={containerRef} />;
}
