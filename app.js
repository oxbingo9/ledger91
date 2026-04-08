import React, { useState } from 'react';
import { db } from './firebase'; // firebase 설정 파일이 따로 있다고 가정
import { doc, getDoc } from "firebase/firestore";

function App() {
  const [year, setYear] = useState('');
  const [chairman, setChairman] = useState('');

  const searchChairman = async () => {
    // 'insa' 컬렉션에서 입력한 연도(문서ID)를 가져옴
    const docRef = doc(db, "insa", year);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      setChairman(docSnap.data().chairman);
    } else {
      alert("해당 연도 데이터가 없습니다!");
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <input 
        value={year} 
        onChange={(e) => setYear(e.target.value)} 
        placeholder="기준년도(예: 2024)" 
      />
      <button onClick={searchChairman}>조회</button>
      {chairman && <p>{year}년 회장님은: {chairman}</p>}
    </div>
  );
}

export default App;
