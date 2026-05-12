/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Heart, Play, RotateCcw } from 'lucide-react';

// 定義相關型別
type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type GameState = 'START' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

type FoodType = 'NORMAL' | 'GOLDEN' | 'SLOW' | 'FAST';
interface Food {
  pos: Point;
  type: FoodType;
}

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;

export default function App() {
  // 狀態管理
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [food, setFood] = useState<Food>({ pos: { x: 5, y: 5 }, type: 'NORMAL' });
  const [obstacles, setObstacles] = useState<Point[]>([]);
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [specialEffect, setSpecialEffect] = useState<{ type: 'SLOW' | 'FAST' | null, remainingTime: number }>({ type: null, remainingTime: 0 });

  // 工具：檢查位置是否有效
  const isValidPosition = useCallback((p: Point, currentSnake: Point[], currentObstacles: Point[]) => {
    return !currentSnake.some(s => s.x === p.x && s.y === p.y) &&
           !currentObstacles.some(o => o.x === p.x && o.y === p.y);
  }, []);

  // 隨機生成食物座標與型別
  const generateFood = useCallback((currentSnake: Point[], currentObstacles: Point[]): Food => {
    let newPos: Point;
    do {
      newPos = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
    } while (!isValidPosition(newPos, currentSnake, currentObstacles));
    
    const rand = Math.random();
    const type: FoodType = rand < 0.1 ? 'GOLDEN' : rand < 0.2 ? 'SLOW' : rand < 0.3 ? 'FAST' : 'NORMAL';
    return { pos: newPos, type };
  }, [isValidPosition]);

  // 生成障礙物
  const generateObstacles = useCallback(() => {
    const newObstacles: Point[] = [];
    for(let i=0; i<5; i++) {
        let p: Point;
        do {
            p = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
        } while(newObstacles.some(o => o.x===p.x && o.y===p.y) || (p.x === 10 && p.y === 10));
        newObstacles.push(p);
    }
    return newObstacles;
  }, []);

  // 遊戲迴圈
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const actualSpeed = specialEffect.type === 'SLOW' ? speed * 1.5 : (specialEffect.type === 'FAST' ? speed * 0.5 : speed);

    const interval = setInterval(() => {
      setSnake((prevSnake) => {
        const newSnake = [...prevSnake];
        const head = { ...newSnake[0] };

        // 根據方向移動蛇頭
        switch (direction) {
          case 'UP': head.y -= 1; break;
          case 'DOWN': head.y += 1; break;
          case 'LEFT': head.x -= 1; break;
          case 'RIGHT': head.x += 1; break;
        }

        // 碰撞檢查
        const hitWall = head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE;
        const hitBody = newSnake.some((segment) => segment.x === head.x && segment.y === head.y);
        const hitObstacle = obstacles.some((obs) => obs.x === head.x && obs.y === head.y);

        if (hitWall || hitBody || hitObstacle) {
          if (lives > 1) {
            setLives((l) => l - 1);
            setSnake([{ x: 10, y: 10 }]);
            setDirection('RIGHT');
            return [{ x: 10, y: 10 }];
          } else {
            setLives(0);
            setGameState('GAME_OVER');
            return prevSnake;
          }
        }

        newSnake.unshift(head);

        // 吃食物
        if (head.x === food.pos.x && head.y === food.pos.y) {
          let pointsToAdd = 10;
          let lengthToAdd = 1;

          if (food.type === 'GOLDEN') { pointsToAdd = 30; lengthToAdd = 2; }
          else if (food.type === 'SLOW' || food.type === 'FAST') {
            setSpecialEffect({ type: food.type, remainingTime: 5 });
          }

          setScore((s) => s + pointsToAdd);
          setFood(generateFood(newSnake, obstacles));
          
          // 速度調整
          setSpeed((s) => Math.max(50, s - 5));
          
          if (lengthToAdd === 1) newSnake.pop(); 
          // If lengthToAdd is 2, don't pop, effectively increasing length by 1
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, actualSpeed);

    return () => clearInterval(interval);
  }, [gameState, direction, food, generateFood, lives, obstacles, score, speed, specialEffect.type]);

  // 處理鍵盤輸入
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev));
        return;
      }

      if (gameState !== 'PLAYING') return;

      switch (e.key) {
        case 'ArrowUp': if (direction !== 'DOWN') setDirection('UP'); break;
        case 'ArrowDown': if (direction !== 'UP') setDirection('DOWN'); break;
        case 'ArrowLeft': if (direction !== 'RIGHT') setDirection('LEFT'); break;
        case 'ArrowRight': if (direction !== 'LEFT') setDirection('RIGHT'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, gameState]);

  // 特殊效果計時器
  useEffect(() => {
    if (specialEffect.type && specialEffect.remainingTime > 0) {
      const timer = setInterval(() => {
        setSpecialEffect(prev => ({ ...prev, remainingTime: prev.remainingTime - 1 }));
      }, 1000);
      return () => clearInterval(timer);
    } else if (specialEffect.remainingTime <= 0 && specialEffect.type !== null) {
      setSpecialEffect({ type: null, remainingTime: 0 });
    }
  }, [specialEffect.type, specialEffect.remainingTime]);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection('RIGHT');
    const newObstacles = generateObstacles();
    setObstacles(newObstacles);
    setFood(generateFood([{ x: 10, y: 10 }], newObstacles));
    setGameState('PLAYING');
    setScore(0);
    setLives(3);
    setSpeed(INITIAL_SPEED);
    setSpecialEffect({ type: null, remainingTime: 0 });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 font-sans">
      <h1 className="text-4xl font-bold mb-6 tracking-tight">Pixel 貪食蛇大作戰</h1>
      
      {/* 狀態列 */}
      <div className="flex justify-between w-full max-w-[480px] mb-4 text-xl bg-gray-800 p-4 rounded-lg">
        <div>分數: {score} {specialEffect.type && `(${specialEffect.type} ${specialEffect.remainingTime}s)`}</div>
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart key={i} className={`w-6 h-6 ${i < lives ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          ))}
        </div>
      </div>
      
      <div 
        className="grid border border-gray-700 bg-gray-800 relative"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 24px)` }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
          const x = i % GRID_SIZE;
          const y = Math.floor(i / GRID_SIZE);
          const isSnake = snake.some((segment) => segment.x === x && segment.y === y);
          const isFood = food.pos.x === x && food.pos.y === y;
          const isObstacle = obstacles.some(o => o.x === x && o.y === y);
          const isHead = snake[0].x === x && snake[0].y === y;

          let bgColor = 'bg-gray-800';
          if (isHead) bgColor = 'bg-green-500';
          else if (isSnake) bgColor = 'bg-green-700';
          else if (isObstacle) bgColor = 'bg-gray-500';
          else if (isFood) {
              if (food.type === 'GOLDEN') bgColor = 'bg-yellow-400';
              else if (food.type === 'SLOW') bgColor = 'bg-blue-400';
              else if (food.type === 'FAST') bgColor = 'bg-purple-500';
              else bgColor = 'bg-red-500';
          }

          return (
            <div
              key={i}
              className={`w-6 h-6 ${bgColor}`}
            />
          );
        })}

        {/* 遊戲狀態覆蓋層 */}
        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
            {gameState === 'START' && (
              <>
                <h2 className="text-3xl font-bold mb-6">準備開始？</h2>
                <button onClick={resetGame} className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-lg font-semibold transition">
                  <Play className="w-5 h-5" /> 開始遊戲
                </button>
              </>
            )}
            {gameState === 'PAUSED' && (
              <h2 className="text-4xl font-bold text-yellow-500">暫停中</h2>
            )}
            {gameState === 'GAME_OVER' && (
              <>
                <h2 className="text-5xl font-bold mb-4 text-red-500">遊戲結束</h2>
                <p className="text-2xl mb-6">最終分數: {score}</p>
                <button onClick={resetGame} className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-lg font-semibold transition">
                  <RotateCcw className="w-5 h-5" /> 重新開始
                </button>
              </>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-6 text-gray-400 text-sm">
        操作: 方向鍵移動, P 暫停/繼續
      </div>
    </div>
  );
}
