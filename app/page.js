"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

const firebaseConfig = {
  apiKey: "AIzaSyBi82idZAraoDMEMVBhVv66tURB0lSI0UM",
  authDomain: "ledger91-e95ea.firebaseapp.com",
  projectId: "ledger91-e95ea",
  storageBucket: "ledger91-e95ea.firebasestorage.app",
  messagingSenderId: "747494068723",
  appId: "1:747494068723:web:67fe836743fb16f89f8286"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// 겹치지 않게 위치 배정
function placeNoOverlap(count, areaW, areaH, itemW, itemH, margin = 18) {
  const placed = [];
  const maxTry = 500;
  for (let i = 0; i < count; i++) {
    let x, y, tries = 0, ok = false;
    while (tries < maxTry) {
      x = Math.random() * (areaW - itemW);
      y = Math.random() * (areaH - itemH);
      ok = placed.every(p =>
        x + itemW + margin < p.x || x > p.x + itemW + margin ||
        y + itemH + margin < p.y || y > p.y + itemH + margin
      );
      if (ok) break;
      tries++;
    }
    placed.push({ x, y });
  }
  return placed;
}

export default function LoginPage() {
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState(null);
  // 각 ○의 채워짐 상태: { memberIdx: char | null }
  const [filled, setFilled] = useState({});
  const [allDone, setAllDone] = useState(false);
  const [failIdx, setFailIdx] = useState(null);

  const dragChar = useRef("");
  const dragChipId = useRef(null);
  const touchCloneRef = useRef(null);
  const touchChipId = useRef(null);
  const touchCharRef = useRef("");

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, "members"));
        const all = snap.docs.map(d => d.data()).filter(d => d.NAME && d.NAME.length >= 2);
        setMembers(all);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const initGame = useCallback(() => {
    if (members.length === 0) return;

    const areaW = Math.min(window.innerWidth, 480);
    const areaH = window.innerHeight;

    // 각 회원마다 히든 인덱스 랜덤 배정
    const hiddenMap = members.map(m => ({
      name: m.NAME,
      hiddenIdx: Math.floor(Math.random() * m.NAME.length),
      hiddenChar: ""
    }));
    hiddenMap.forEach(h => { h.hiddenChar = h.name[h.hiddenIdx]; });

    // 드래그 칩: 히든 글자들 (중복 제거 후 셔플)
    const uniqueChars = [...new Set(hiddenMap.map(h => h.hiddenChar))];
    const chips = uniqueChars
      .sort(() => Math.random() - 0.5)
      .map((char, i) => ({ id: `chip_${i}`, char }));

    // 이름 카드 위치: 상단 60% 영역
    const nameAreaH = areaH * 0.58;
    const namePositions = placeNoOverlap(
      members.length, areaW - 100, nameAreaH - 80, 90, 40, 22
    );

    // 칩 위치: 하단 35% 영역
    const chipAreaH = areaH * 0.32;
    const chipPositions = placeNoOverlap(
      chips.length, areaW - 60, chipAreaH, 48, 48, 14
    ).map(p => ({ x: p.x, y: p.y + areaH * 0.62 }));

    setGameData({ hiddenMap, chips, namePositions, chipPositions });
    setFilled({});
    setAllDone(false);
    setFailIdx(null);
  }, [members]);

  useEffect(() => {
    if (members.length > 0) initGame();
  }, [members, initGame]);

  function checkDrop(char, chipId, memberIdx) {
    const { hiddenMap } = gameData;
    const targetChar = hiddenMap[memberIdx].hiddenChar;

    // 같은 글자면 어디든 OK, 아니면 해당 ○의 글자와 일치해야 OK
    if (char === targetChar) {
      const newFilled = { ...filled, [memberIdx]: char };
      setFilled(newFilled);

      // 칩 제거: 같은 글자의 모든 ○가 채워졌으면 칩 숨김
      const allSameCharFilled = hiddenMap
        .filter(h => h.hiddenChar === char)
        .every((_, i) => {
          const idx = hiddenMap.findIndex((h, ii) => h.hiddenChar === char && !newFilled[ii] && ii !== memberIdx);
          return idx === -1;
        });

      // 전체 완료 체크
      const total = hiddenMap.length;
      const doneCount = Object.keys(newFilled).length;
      if (doneCount >= total) {
        setAllDone(true);
        setTimeout(() => router.push("/ledger"), 1800);
      }
    } else {
      setFailIdx(memberIdx);
      setTimeout(() => setFailIdx(null), 600);
    }
  }

  // 드래그 (PC)
  function onDragStart(e, char, chipId) {
    dragChar.current = char;
    dragChipId.current = chipId;
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(e) { e.preventDefault(); }
  function onDragEnter(e) { e.currentTarget.classList.add("drag-over"); }
  function onDragLeave(e) { e.currentTarget.classList.remove("drag-over"); }
  function onDrop(e, memberIdx) {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    checkDrop(dragChar.current, dragChipId.current, memberIdx);
  }

  // 터치 (모바일)
  function onTouchStart(e, char, chipId) {
    e.preventDefault();
    touchChipId.current = chipId;
    touchCharRef.current = char;
    const t = e.touches[0];
    const clone = document.createElement("div");
    clone.textContent = char;
    clone.style.cssText = `position:fixed;width:48px;height:48px;border-radius:50%;background:#0f3460;border:2px solid #e94560;color:white;font-size:20px;font-weight:bold;display:flex;align-items:center;justify-content:center;left:${t.clientX-24}px;top:${t.clientY-24}px;z-index:999;pointer-events:none;line-height:48px;text-align:center;`;
    document.body.appendChild(clone);
    touchCloneRef.current = clone;
  }
  function onTouchMove(e) {
    e.preventDefault();
    const t = e.touches[0];
    if (touchCloneRef.current) {
      touchCloneRef.current.style.left = (t.clientX - 24) + "px";
      touchCloneRef.current.style.top = (t.clientY - 24) + "px";
    }
    document.querySelectorAll(".hole").forEach(el => el.classList.remove("drag-over"));
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (el && el.classList.contains("hole")) el.classList.add("drag-over");
  }
  function onTouchEnd(e) {
    if (touchCloneRef.current) { touchCloneRef.current.remove(); touchCloneRef.current = null; }
    document.querySelectorAll(".hole").forEach(el => el.classList.remove("drag-over"));
    const t = e.changedTouches[0];
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (el && el.dataset.memberidx !== undefined) {
      checkDrop(touchCharRef.current, touchChipId.current, Number(el.dataset.memberidx));
    }
    touchChipId.current = null;
    touchCharRef.current = "";
  }

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#1a1a2e",color:"#aaa",fontFamily:"'Noto Sans KR',sans-serif",fontSize:"16px"}}>
      불러오는 중...
    </div>
  );
  if (!gameData) return null;

  const { hiddenMap, chips, namePositions, chipPositions } = gameData;

  // 아직 채워지지 않은 ○의 히든 글자 목록
  const remainingChars = new Set(
    hiddenMap
      .filter((h, i) => !filled[i])
      .map(h => h.hiddenChar)
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Noto Sans KR', sans-serif; background: #1a1a2e; overflow: hidden; }

        .top-label { position: fixed; top: 14px; left: 0; right: 0; text-align: center; pointer-events: none; z-index: 10; }
        .top-label-sub { font-size: 11px; color: #444; letter-spacing: 2px; }
        .top-label-main { font-size: 13px; color: #666; margin-top: 3px; }

        /* 구분선 */
        .divider { position: fixed; left: 0; right: 0; height: 1px; background: #222; z-index: 5; }

        .name-card { position: absolute; display: flex; gap: 3px; }
        .name-char { width: 32px; height: 32px; border-radius: 7px; background: #16213e; border: 1px solid #2a3a5e; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: bold; color: #aaa; }
        .hole { border: 2px dashed #e94560 !important; background: #0f3460 !important; color: transparent; cursor: pointer; transition: all 0.15s; }
        .hole.drag-over { border-color: #fff !important; background: #1a5090 !important; transform: scale(1.15); }
        .hole.correct { border: 2px solid #28a745 !important; background: #1a4a2e !important; color: #5dff8f !important; animation: pop 0.3s ease; }
        .hole.fail { animation: shake 0.5s ease; }
        @keyframes pop { 0%{transform:scale(0.8)} 60%{transform:scale(1.2)} 100%{transform:scale(1)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }

        .chip { position: absolute; width: 46px; height: 46px; border-radius: 50%; background: #0f3460; border: 2px solid #e94560; color: white; font-size: 19px; font-weight: bold; display: flex; align-items: center; justify-content: center; cursor: grab; touch-action: none; transition: opacity 0.2s, box-shadow 0.15s; }
        .chip:active { transform: scale(1.15); box-shadow: 0 6px 20px rgba(233,69,96,0.5); }
        .chip.used { opacity: 0 !important; pointer-events: none; }

        .success-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 100; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .success-text { color: #5dff8f; font-size: 26px; font-weight: bold; margin-bottom: 10px; animation: pop 0.4s ease; }
        .success-sub { color: #888; font-size: 14px; }

        .retry-btn { position: fixed; bottom: 18px; right: 18px; background: none; border: 1px solid #333; color: #555; border-radius: 20px; padding: 6px 16px; font-size: 12px; cursor: pointer; font-family: inherit; z-index: 10; }
        .retry-btn:hover { border-color: #666; color: #999; }

        /* 진행률 */
        .progress { position: fixed; top: 52px; left: 50%; transform: translateX(-50%); display: flex; gap: 5px; z-index: 10; }
        .progress-dot { width: 7px; height: 7px; border-radius: 50%; background: #333; transition: background 0.3s; }
        .progress-dot.done { background: #28a745; }
      `}</style>

      <div className="top-label">
        <div className="top-label-sub">Simple Ledger91</div>
        <div className="top-label-main">○ 안에 알맞은 글자를 드래그하세요</div>
      </div>

      {/* 진행률 도트 */}
      <div className="progress">
        {hiddenMap.map((_, i) => (
          <div key={i} className={`progress-dot${filled[i] ? " done" : ""}`} />
        ))}
      </div>

      {/* 구분선 */}
      <div className="divider" style={{ top: `${window.innerHeight * 0.6}px` }} />

      <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>

        {/* 이름 카드들 */}
        {members.map((m, mi) => {
          const pos = namePositions[mi] || { x: 0, y: 0 };
          const { hiddenIdx, hiddenChar } = hiddenMap[mi];
          const isFilled = !!filled[mi];
          return (
            <div
              key={mi}
              className="name-card"
              style={{ left: (pos.x + 10) + "px", top: (pos.y + 64) + "px" }}
            >
              {m.NAME.split("").map((ch, ci) => {
                const isHole = ci === hiddenIdx;
                return (
                  <div
                    key={ci}
                    className={`name-char${isHole ? " hole" + (isFilled ? " correct" : "") + (failIdx === mi ? " fail" : "") : ""}`}
                    data-memberidx={isHole ? mi : undefined}
                    onDragOver={isHole && !isFilled ? onDragOver : undefined}
                    onDragEnter={isHole && !isFilled ? onDragEnter : undefined}
                    onDragLeave={isHole && !isFilled ? onDragLeave : undefined}
                    onDrop={isHole && !isFilled ? (e) => onDrop(e, mi) : undefined}
                  >
                    {isHole ? (isFilled ? filled[mi] : "") : ch}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* 글자 칩들 */}
        {chips.map((chip, ci) => {
          const pos = chipPositions[ci] || { x: 0, y: 0 };
          const isUsed = !remainingChars.has(chip.char);
          return (
            <div
              key={chip.id}
              className={`chip${isUsed ? " used" : ""}`}
              style={{ left: pos.x + "px", top: pos.y + "px" }}
              draggable={!isUsed}
              onDragStart={(e) => onDragStart(e, chip.char, chip.id)}
              onTouchStart={(e) => onTouchStart(e, chip.char, chip.id)}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {chip.char}
            </div>
          );
        })}
      </div>

      {allDone && (
        <div className="success-overlay">
          <div className="success-text">✓ 확인되었습니다</div>
          <div className="success-sub">이동 중...</div>
        </div>
      )}

      <button className="retry-btn" onClick={initGame}>↺ 새로고침</button>
    </>
  );
}
