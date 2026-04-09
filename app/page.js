


"use client";
import { useEffect, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBi82idZAraoDMEMVBhVv66tURB0lSI0UM",
  authDomain: "ledger91-e95ea.firebaseapp.com",
  databaseURL: "https://ledger91-e95ea-default-rtdb.firebaseio.com",
  projectId: "ledger91-e95ea",
  storageBucket: "ledger91-e95ea.firebasestorage.app",
  messagingSenderId: "747494068723",
  appId: "1:747494068723:web:67fe836743fb16f89f8286",
  measurementId: "G-LWQ95J4B1B"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const EMPTY_FORM = { date: "", desc: "", amt: "" };

export default function Home() {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear-1, currentYear-2, currentYear-3];

  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [insa, setInsa] = useState(null);
  const [items, setItems] = useState([]);
  const [pw, setPw] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showInForm, setShowInForm] = useState(false);
  const [showOutForm, setShowOutForm] = useState(false);
  const [inForm, setInForm] = useState(EMPTY_FORM);
  const [outForm, setOutForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchInsa() {
      setLoading(true);
      try {
        const snapshot = await getDocs(query(collection(db, "insa"), where("YEAR", "==", Number(selectedYear))));
        setInsa(!snapshot.empty ? snapshot.docs[0].data() : null);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetchInsa();
  }, [selectedYear]);

  async function fetchItems() {
    try {
      const snapshot = await getDocs(collection(db, "data"));
      // doc ID도 함께 저장
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtered = all.filter(item => String(item.DATE).includes(selectedYear));
      filtered.sort((a, b) => new Date(a.DATE) - new Date(b.DATE));
      setItems(filtered);
    } catch (e) { console.error(e); }
  }

  useEffect(() => { fetchItems(); }, [selectedYear]);

  function formatDate(dateStr) {
    try {
      const d = new Date(dateStr);
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${m}/${day}`;
    } catch { return dateStr; }
  }

  function checkAdmin(val) {
    setPw(val);
    const serverPw = insa ? String(insa.PWD || "") : "";
    setIsAdmin(val === serverPw && serverPw !== "");
  }

  async function handleSave(type) {
    const form = type === "입금" ? inForm : outForm;
    if (!form.date || !form.desc || !form.amt) {
      alert("날짜, 내용, 금액을 모두 입력해주세요."); return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "data"), {
        DATE: new Date(form.date).toString(),
        TYPE: type,
        DESC: form.desc,
        AMT: Number(String(form.amt).replace(/,/g, "")),
      });
      if (type === "입금") { setInForm(EMPTY_FORM); setShowInForm(false); }
      else { setOutForm(EMPTY_FORM); setShowOutForm(false); }
      await fetchItems();
    } catch (e) { alert("저장 실패: " + e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "data", id));
      await fetchItems();
    } catch (e) { alert("삭제 실패: " + e.message); }
  }

  const inItems = items.filter(i => i.TYPE === "입금");
  const outItems = items.filter(i => i.TYPE === "출금");
  const totalIn = inItems.reduce((s, i) => s + Number(i.AMT || 0), 0);
  const totalOut = outItems.reduce((s, i) => s + Number(i.AMT || 0), 0);
  const carryOver = insa ? Number(insa.CARRYOVER || 0) : 0;
  const balance = carryOver + totalIn - totalOut;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif; background: #f0f2f5; color: #333; }
        .wrap { max-width: 480px; margin: 0 auto; padding: 15px; }
        .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; }
        .header-title { font-size: 12px; color: #888; letter-spacing: 1px; }
        .header-h1 { font-size: 22px; font-weight: bold; color: #1a1a1a; margin-top: 2px; }
        .insa-info { font-size: 11px; color: #666; text-align: right; line-height: 1.8; }
        .frame { background: white; border-radius: 12px; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 15px; }
        .frame-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .frame-title-in { font-weight: bold; color: #28a745; }
        .frame-title-out { font-weight: bold; color: #dc3545; }
        .add-btn { background: #007bff; color: white; border: none; border-radius: 50%; width: 28px; height: 28px; font-size: 20px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        select { font-size: 20px; font-weight: bold; color: #007bff; border: 2px solid #007bff; padding: 8px 15px; border-radius: 8px; cursor: pointer; background: #fff; min-width: 120px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
        th { background: #f8f9fa; border-bottom: 2px solid #dee2e6; color: #666; font-weight: bold; padding: 10px 5px; }
        td { padding: 10px 5px; border-bottom: 1px solid #eee; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .col-date { width: 55px; text-align: center; color: #888; }
        .col-desc { text-align: left; padding-left: 10px; }
        .col-amt { width: 85px; text-align: right; font-weight: 500; }
        .col-del { width: 30px; text-align: center; }
        .del-btn { background: none; border: none; color: #ccc; font-size: 16px; cursor: pointer; padding: 0; line-height: 1; }
        .del-btn:hover { color: #ff4d4d; }
        .plus { color: #28a745; }
        .minus { color: #dc3545; }
        .empty { color: #aaa; font-size: 12px; text-align: center; padding: 15px 0; }
        .summary-row { display: flex; justify-content: space-between; font-size: 15px; padding: 4px 0; }
        .balance { font-weight: bold; color: #007bff; font-size: 18px; margin-top: 10px; }
        .footer { margin-top: 20px; text-align: center; padding-bottom: 30px; }
        input[type=password] { padding: 10px; width: 140px; border: 1px solid #ddd; border-radius: 6px; text-align: center; font-size: 14px; }
        .loading { text-align: center; padding: 40px; color: #aaa; }
        .input-form { background: #f9f9f9; border: 1px solid #eee; border-radius: 8px; padding: 12px; margin-top: 12px; }
        .input-form input { width: 100%; padding: 9px 10px; margin-bottom: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; font-family: inherit; }
        .form-btns { display: flex; gap: 8px; margin-top: 8px; }
        .btn-save { flex: 1; background: #007bff; color: white; border: none; border-radius: 6px; padding: 10px; font-size: 14px; font-family: inherit; cursor: pointer; }
        .btn-cancel { flex: 1; background: #eee; color: #555; border: none; border-radius: 6px; padding: 10px; font-size: 14px; font-family: inherit; cursor: pointer; }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div className="wrap">
        {/* 헤더 */}
        <div className="header">
          <div>
            <div className="header-title">Simple Ledger91</div>
            <div className="header-h1">구일회비관리</div>
          </div>
          <div className="insa-info">
            회장: {insa ? insa.CHAIRMAN : "-"}<br />
            총무: {insa ? insa.SECRETARY : "-"}
          </div>
        </div>

        {/* 기준년도 */}
        <div className="frame">
          <span style={{fontWeight:"bold", color:"#666", marginRight:"10px"}}>기준년도</span>
          <select value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setIsAdmin(false); setPw(""); setShowInForm(false); setShowOutForm(false); }}>
            {years.map(y => <option key={y} value={String(y)}>{y}년</option>)}
          </select>
        </div>

        {loading ? <div className="loading">불러오는 중...</div> : <>

          {/* 입금내역 */}
          <div className="frame">
            <div className="frame-header">
              <div className="frame-title-in">↓ 입금내역</div>
              {isAdmin && <button className="add-btn" onClick={() => setShowInForm(!showInForm)}>+</button>}
            </div>
            {showInForm && (
              <div className="input-form">
                <input type="date" value={inForm.date} onChange={e => setInForm({...inForm, date: e.target.value})} />
                <input type="text" placeholder="내용" value={inForm.desc} onChange={e => setInForm({...inForm, desc: e.target.value})} />
                <input type="number" placeholder="금액" value={inForm.amt} onChange={e => setInForm({...inForm, amt: e.target.value})} />
                <div className="form-btns">
                  <button className="btn-save" onClick={() => handleSave("입금")} disabled={saving}>{saving ? "저장중..." : "저장"}</button>
                  <button className="btn-cancel" onClick={() => { setShowInForm(false); setInForm(EMPTY_FORM); }}>취소</button>
                </div>
              </div>
            )}
            <table>
              <thead>
                <tr>
                  <th className="col-date">날짜</th>
                  <th className="col-desc">내용</th>
                  <th className="col-amt">금액</th>
                  {isAdmin && <th className="col-del"></th>}
                </tr>
              </thead>
              <tbody>
                {inItems.length === 0
                  ? <tr><td colSpan={isAdmin ? 4 : 3} className="empty">내역 없음</td></tr>
                  : inItems.map((item) => (
                    <tr key={item.id}>
                      <td className="col-date">{formatDate(item.DATE)}</td>
                      <td className="col-desc">{item.DESC}</td>
                      <td className="col-amt plus">{Number(item.AMT).toLocaleString()}</td>
                      {isAdmin && <td className="col-del"><button className="del-btn" onClick={() => handleDelete(item.id)}>✕</button></td>}
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>

          {/* 출금내역 */}
          <div className="frame">
            <div className="frame-header">
              <div className="frame-title-out">↑ 출금내역</div>
              {isAdmin && <button className="add-btn" onClick={() => setShowOutForm(!showOutForm)}>+</button>}
            </div>
            {showOutForm && (
              <div className="input-form">
                <input type="date" value={outForm.date} onChange={e => setOutForm({...outForm, date: e.target.value})} />
                <input type="text" placeholder="내용" value={outForm.desc} onChange={e => setOutForm({...outForm, desc: e.target.value})} />
                <input type="number" placeholder="금액" value={outForm.amt} onChange={e => setOutForm({...outForm, amt: e.target.value})} />
                <div className="form-btns">
                  <button className="btn-save" onClick={() => handleSave("출금")} disabled={saving}>{saving ? "저장중..." : "저장"}</button>
                  <button className="btn-cancel" onClick={() => { setShowOutForm(false); setOutForm(EMPTY_FORM); }}>취소</button>
                </div>
              </div>
            )}
            <table>
              <thead>
                <tr>
                  <th className="col-date">날짜</th>
                  <th className="col-desc">내용</th>
                  <th className="col-amt">금액</th>
                  {isAdmin && <th className="col-del"></th>}
                </tr>
              </thead>
              <tbody>
                {outItems.length === 0
                  ? <tr><td colSpan={isAdmin ? 4 : 3} className="empty">내역 없음</td></tr>
                  : outItems.map((item) => (
                    <tr key={item.id}>
                      <td className="col-date">{formatDate(item.DATE)}</td>
                      <td className="col-desc">{item.DESC}</td>
                      <td className="col-amt minus">{Number(item.AMT).toLocaleString()}</td>
                      {isAdmin && <td className="col-del"><button className="del-btn" onClick={() => handleDelete(item.id)}>✕</button></td>}
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>

          {/* 잔액 */}
          <div className="frame">
            <div className="summary-row"><span>이월금액</span><span>{carryOver.toLocaleString()}원</span></div>
            <div className="summary-row"><span>총 입금</span><span className="plus">+{totalIn.toLocaleString()}원</span></div>
            <div className="summary-row"><span>총 출금</span><span className="minus">-{totalOut.toLocaleString()}원</span></div>
            <div className="summary-row balance"><span>현재잔액</span><span>{balance.toLocaleString()}원</span></div>
          </div>

        </>}

        {/* 비밀번호 */}
        <div className="footer">
          <input
            type="password"
            placeholder="비밀번호"
            value={pw}
            onChange={e => checkAdmin(e.target.value)}
          />
          {isAdmin && <p style={{marginTop:"10px", color:"#28a745", fontSize:"13px"}}>✅ 관리자 모드</p>}
        </div>
      </div>
    </>
  );
}
